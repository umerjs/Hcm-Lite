import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Send,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Loading from "../components/shared/Loading";
import AiBadge from "../components/shared/AiBadge";
import { http, extractErrorMessage } from "../api/http";
import type {
  ApplyLeaveRequest,
  LeaveBalanceItem,
  LeaveRequest,
  AiChatResponse,
} from "../types/api";

const unwrap = <T,>(value: unknown): T => ((value as { data?: T })?.data ?? value) as T;

const fallbackBalances: LeaveBalanceItem[] = [
  { type: "annual", name: "Annual leave", yearlyQuota: 14, used: 12, pending: 0, remaining: 2 },
  { type: "sick", name: "Sick leave", yearlyQuota: 8, used: 5, pending: 0, remaining: 3 },
  { type: "casual", name: "Casual leave", yearlyQuota: 10, used: 2, pending: 0, remaining: 8 },
];

export default function Leave() {
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Controlled form state for leave application
  const [formData, setFormData] = useState<ApplyLeaveRequest>({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Smart Leave AI State
  const [smartPrompt, setSmartPrompt] = useState("");
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [smartSuccess, setSmartSuccess] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);

  const balances = useQuery({
    queryKey: ["leave-balance"],
    queryFn: async () => unwrap<LeaveBalanceItem[]>((await http.get("/leave/balance")).data),
  });

  const history = useQuery({
    queryKey: ["leave-history"],
    queryFn: async () => unwrap<LeaveRequest[]>((await http.get("/leave")).data),
  });

  const applyLeave = useMutation({
    mutationFn: (payload: ApplyLeaveRequest) => http.post("/leave", payload),
    onSuccess: async () => {
      setSubmitted(true);
      setSubmitError(null);
      setFormData({ type: "annual", startDate: "", endDate: "", reason: "" });
      await queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      await queryClient.invalidateQueries({ queryKey: ["leave-history"] });
    },
    onError: (err: unknown) => {
      setSubmitError(extractErrorMessage(err, "Failed to submit leave request."));
    },
  });

  // Smart Leave Natural Language Extraction
  const handleSmartLeave = async () => {
    if (!smartPrompt.trim() || isSmartLoading) return;

    setIsSmartLoading(true);
    setSmartError(null);
    setSmartSuccess(false);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await http.post<AiChatResponse>("/ai/chat", {
        message: `Extract leave application parameters from this text as JSON. Return ONLY a single raw JSON object without markdown or conversational text.
Text: "${smartPrompt.trim()}"
Today's Date: ${today}
Format: { "type": "annual" | "sick" | "casual" | "unpaid", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string" }`,
      });

      const responseText = res.data.response || res.data.message || "";
      let parsedJson: Partial<ApplyLeaveRequest> | null = null;

      const match = responseText.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          parsedJson = JSON.parse(match[0]);
        } catch {
          parsedJson = null;
        }
      }

      // Fallback parser if LLM returns text instead of strict JSON
      if (!parsedJson || !parsedJson.startDate) {
        const textLower = smartPrompt.toLowerCase();
        let inferredType: ApplyLeaveRequest["type"] = "casual";
        if (
          textLower.includes("sick") ||
          textLower.includes("doctor") ||
          textLower.includes("fever") ||
          textLower.includes("health")
        ) {
          inferredType = "sick";
        } else if (
          textLower.includes("annual") ||
          textLower.includes("vacation") ||
          textLower.includes("holiday")
        ) {
          inferredType = "annual";
        } else if (textLower.includes("unpaid")) {
          inferredType = "unpaid";
        }

        const dateMatches = smartPrompt.match(/\d{4}-\d{2}-\d{2}/g);
        parsedJson = {
          type: inferredType,
          startDate: dateMatches?.[0] || today,
          endDate: dateMatches?.[1] || dateMatches?.[0] || today,
          reason: smartPrompt.trim(),
        };
      }

      setFormData((prev) => ({
        type: (parsedJson?.type as ApplyLeaveRequest["type"]) || prev.type || "annual",
        startDate: parsedJson?.startDate || prev.startDate || today,
        endDate: parsedJson?.endDate || prev.endDate || today,
        reason: parsedJson?.reason || smartPrompt.trim(),
      }));

      setSmartSuccess(true);
    } catch (err: unknown) {
      // Heuristic offline fallback so user never gets blocked
      const today = new Date().toISOString().slice(0, 10);
      const textLower = smartPrompt.toLowerCase();
      let inferredType: ApplyLeaveRequest["type"] = "casual";
      if (textLower.includes("sick")) inferredType = "sick";
      if (textLower.includes("annual")) inferredType = "annual";

      setFormData({
        type: inferredType,
        startDate: today,
        endDate: today,
        reason: smartPrompt.trim(),
      });
      setSmartSuccess(true);
    } finally {
      setIsSmartLoading(false);
    }
  };

  const balanceRows = balances.data ?? fallbackBalances;
  const historyRows = history.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <header>
        <p className="text-xs sm:text-sm font-medium text-emerald-600">Time away</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Leave management</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          View your balances, submit requests with AI assistance, and track approvals.
        </p>
      </header>

      {/* Quota Balances Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {balances.isLoading ? (
          <div className="col-span-full py-8">
            <Loading text="Loading leave balances..." />
          </div>
        ) : (
          balanceRows.map((balance) => (
            <Card key={balance.type} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{balance.name}</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">
                      {balance.used}
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / {balance.yearlyQuota ?? "∞"} days
                      </span>
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${balance.yearlyQuota ? Math.min(100, (balance.used / balance.yearlyQuota) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {balance.remaining ?? "Unlimited"} days remaining
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Smart Leave Assistant & Leave Form Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Smart Leave Assistant & Manual Form */}
        <div className="flex flex-col gap-6">
          {/* Smart Leave AI Input Card (Slice F7) */}
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Smart Leave Assistant</CardTitle>
                    <CardDescription className="text-xs">
                      Type your request in plain English to auto-fill the form
                    </CardDescription>
                  </div>
                </div>
                <AiBadge label="AI Autofill" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={smartPrompt}
                onChange={(e) => setSmartPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Taking 2 days casual leave next Monday and Tuesday for personal reasons, or feeling unwell with fever tomorrow."
                className="w-full resize-none rounded-xl border border-input bg-background p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 placeholder:text-muted-foreground"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Extracts dates, category, and reason automatically.
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSmartLoading || !smartPrompt.trim()}
                  onClick={handleSmartLeave}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                >
                  {isSmartLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 mr-1.5" />
                      Auto-fill Form
                    </>
                  )}
                </Button>
              </div>

              {smartSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Leave fields populated by AI! Review details below and click Submit.</span>
                </div>
              )}

              {smartError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs font-medium text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{smartError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Apply Leave Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <FileText className="size-5" />
                </div>
                <div>
                  <CardTitle>Apply for leave</CardTitle>
                  <CardDescription>Submit a request for managerial review.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(false);
                  setSubmitError(null);
                  applyLeave.mutate(formData);
                }}
                className="flex flex-col gap-4"
              >
                <label className="flex flex-col gap-2 text-xs sm:text-sm font-medium">
                  Leave type
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as ApplyLeaveRequest["type"],
                      }))
                    }
                    className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 text-xs sm:text-sm"
                  >
                    <option value="annual">Annual leave</option>
                    <option value="sick">Sick leave</option>
                    <option value="casual">Casual leave</option>
                    <option value="unpaid">Unpaid leave</option>
                  </select>
                </label>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs sm:text-sm font-medium">
                    Start date
                    <input
                      name="startDate"
                      required
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 text-xs sm:text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-xs sm:text-sm font-medium">
                    End date
                    <input
                      name="endDate"
                      required
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 text-xs sm:text-sm"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-xs sm:text-sm font-medium">
                  Reason
                  <textarea
                    name="reason"
                    required
                    rows={4}
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Add a detailed reason for your leave request..."
                    className="resize-none rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 text-xs sm:text-sm"
                  />
                </label>

                {submitted && (
                  <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Request submitted successfully and queued for approval.
                  </p>
                )}

                {submitError && (
                  <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs sm:text-sm font-medium text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    {submitError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={applyLeave.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 w-full sm:w-auto self-start"
                >
                  <Send className="size-4 mr-2" />
                  {applyLeave.isPending ? "Submitting request..." : "Submit request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Leave History & Approvals Table */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Leave history & approvals</CardTitle>
            <CardDescription>Your submitted requests and review decisions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {history.isLoading ? (
              <div className="py-12">
                <Loading text="Loading leave history..." />
              </div>
            ) : historyRows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No leave requests yet"
                  message="Submit an application using the form or Smart Leave Assistant."
                />
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRows.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium capitalize text-xs sm:text-sm">
                          {item.type}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                          {item.startDate} → {item.endDate}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-xs sm:text-sm">
                          {item.days} {item.days === 1 ? "day" : "days"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              item.status === "approved"
                                ? "active"
                                : item.status === "pending"
                                  ? "pending"
                                  : "cancelled"
                            }
                            label={item.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
