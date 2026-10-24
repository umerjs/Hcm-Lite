import { useState } from "react";
import { ArrowUpRight, CalendarCheck2, Check, Clock3, FileCheck2, Sparkles, Users, X, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { http, extractErrorMessage } from "../api/http";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { StatCard, StatusBadge, AiBadge } from "../components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import type { AiChatResponse, EmployeeDashboardResponse, HrDashboardResponse } from "../types/api";

const unwrap = <T,>(value: T | { data: T }): T =>
  (value && typeof value === "object" && "data" in value ? (value as any).data : value) as T;

const chartTooltip = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    fontSize: "12px",
  },
};

export default function Dashboard() {
  const [dismissed, setDismissed] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const hr = useQuery({
    queryKey: ["analytics", "hr"],
    queryFn: async () => unwrap<HrDashboardResponse>((await http.get<HrDashboardResponse>("/analytics/hr")).data),
  });

  const me = useQuery({
    queryKey: ["analytics", "me"],
    queryFn: async () => unwrap<EmployeeDashboardResponse>((await http.get<EmployeeDashboardResponse>("/analytics/me")).data),
  });

  const summarize = useMutation({
    mutationFn: async () => {
      const data = hr.data ?? me.data;
      const response = await http.post<AiChatResponse>("/ai/chat", {
        message: `Summarize this dashboard data concisely: ${JSON.stringify(data)}`,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSummaryError(null);
      setSummary(data.response ?? data.message ?? "No summary available.");
    },
    onError: (err: unknown) => {
      setSummaryError(extractErrorMessage(err, "Failed to generate AI summary."));
    },
  });

  const total = hr.data?.totalEmployees ?? 0;
  const present = hr.data?.todayAttendance.present ?? me.data?.currentMonthAttendance.present ?? 0;
  const onLeave = hr.data?.todayAttendance.onLeave ?? 0;
  const pending = hr.data?.pendingLeaves ?? me.data?.pendingRequests ?? 0;
  const attendanceData = [
    {
      department: "Today",
      present,
      late: hr.data?.todayAttendance.late ?? me.data?.currentMonthAttendance.late ?? 0,
    },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-emerald-600">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Good day</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Here&apos;s an operational overview of your workforce and activities today.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-fit gap-2 self-start mt-2 sm:mt-0">
          <ArrowUpRight className="size-4" /> View reports
        </Button>
      </header>

      {/* Workforce Metric Cards */}
      <section aria-label="Workforce overview" className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total employees"
          value={<span className="tabular-nums">{total || "—"}</span>}
          subtitle="Active workforce"
          icon={Users}
        />
        <StatCard
          title="Present today"
          value={<span className="tabular-nums">{present || "—"}</span>}
          subtitle="Live attendance"
          icon={CalendarCheck2}
        />
        <StatCard
          title="On leave"
          value={<span className="tabular-nums">{onLeave || "—"}</span>}
          subtitle="Approved leave"
          icon={Clock3}
        />
        <StatCard
          title="Pending approvals"
          value={<span className="tabular-nums">{pending || "—"}</span>}
          subtitle="Requests in queue"
          icon={FileCheck2}
        />
      </section>

      {/* Live Sync Banner */}
      {!dismissed && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100 animate-in fade-in">
          <Check className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">
            <strong>System online.</strong> Real-time metrics are synced with the HCM database.
          </p>
          <button
            aria-label="Dismiss attendance insight"
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* AI Summary & Attendance Chart Grid */}
      <section className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* AI Summary Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI dashboard summary</CardTitle>
              <AiBadge />
            </div>
            <CardDescription>Generate an automated executive readout of current activity.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-1">
            <Button
              onClick={() => summarize.mutate()}
              disabled={summarize.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700 w-full sm:w-fit"
            >
              {summarize.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating summary...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4 text-amber-300" />
                  Generate AI Summary
                </>
              )}
            </Button>

            {summary && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs sm:text-sm animate-in fade-in">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
            )}

            {summaryError && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                {summaryError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Bar Chart Card */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle>Attendance overview</CardTitle>
              <CardDescription>Live punches & arrivals</CardDescription>
            </div>
            <StatusBadge status="present" label={`${present} present`} />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} {...chartTooltip} />
                  <Bar dataKey="present" fill="#059669" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="late" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Analytics Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics breakdown</CardTitle>
          <CardDescription>Operational metrics fetched for the current account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs sm:text-sm font-medium">Active employees</TableCell>
                  <TableCell className="text-right tabular-nums text-xs sm:text-sm">
                    {hr.data?.activeEmployees ?? me.data?.leaveBalances?.annual?.remaining ?? "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs sm:text-sm font-medium">Late arrivals</TableCell>
                  <TableCell className="text-right tabular-nums text-xs sm:text-sm">
                    {hr.data?.todayAttendance.late ?? me.data?.currentMonthAttendance.late ?? "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs sm:text-sm font-medium">Pending requests</TableCell>
                  <TableCell className="text-right tabular-nums text-xs sm:text-sm">
                    {hr.data?.pendingLeaves ?? me.data?.pendingRequests ?? "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
