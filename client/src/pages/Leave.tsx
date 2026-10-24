import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, FileText, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";
import { http } from "../api/http";
import type { ApplyLeaveRequest, LeaveBalanceItem, LeaveRequest } from "../types/api";

const unwrap = <T,>(value: unknown): T => ((value as { data?: T })?.data ?? value) as T;
const fallbackBalances: LeaveBalanceItem[] = [
  { type: "annual", name: "Annual leave", yearlyQuota: 14, used: 12, pending: 0, remaining: 2 },
  { type: "sick", name: "Sick leave", yearlyQuota: 8, used: 5, pending: 0, remaining: 3 },
  { type: "casual", name: "Casual leave", yearlyQuota: 10, used: 2, pending: 0, remaining: 8 },
];

export default function Leave() {
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const balances = useQuery({ queryKey: ["leave-balance"], queryFn: async () => unwrap<LeaveBalanceItem[]>((await http.get("/leave/balance")).data) });
  const history = useQuery({ queryKey: ["leave-history"], queryFn: async () => unwrap<LeaveRequest[]>((await http.get("/leave")).data) });
  const applyLeave = useMutation({
    mutationFn: (payload: ApplyLeaveRequest) => http.post("/leave", payload),
    onSuccess: async () => { setSubmitted(true); await queryClient.invalidateQueries({ queryKey: ["leave-balance"] }); await queryClient.invalidateQueries({ queryKey: ["leave-history"] }); },
  });
  const balanceRows = balances.data ?? fallbackBalances;
  const historyRows = history.data ?? [];
  return <div className="flex flex-col gap-6">
    <header><p className="text-sm font-medium text-emerald-600">Time away</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Leave management</h1><p className="mt-1 text-sm text-muted-foreground">View your balances, submit requests, and track approvals.</p></header>
    <div className="grid gap-4 md:grid-cols-3">{balanceRows.map((balance) => <Card key={balance.type}><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{balance.name}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{balance.used}<span className="text-base font-normal text-muted-foreground"> / {balance.yearlyQuota ?? "∞"} days</span></p></div><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><CalendarDays /></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${balance.yearlyQuota ? (balance.used / balance.yearlyQuota) * 100 : 0}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{balance.remaining ?? "Unlimited"} days remaining</p></CardContent></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]"><Card><CardHeader><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><FileText /></div><div><CardTitle>Apply for leave</CardTitle><CardDescription>Submit a request for manager approval.</CardDescription></div></div></CardHeader><CardContent><form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); applyLeave.mutate({ type: String(form.get("type")) as ApplyLeaveRequest["type"], startDate: String(form.get("startDate")), endDate: String(form.get("endDate")), reason: String(form.get("reason")) }); }} className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-medium">Leave type<select name="type" className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><option value="annual">Annual leave</option><option value="sick">Sick leave</option><option value="casual">Casual leave</option></select></label><div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm font-medium">Start date<input name="startDate" required type="date" className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" /></label><label className="flex flex-col gap-2 text-sm font-medium">End date<input name="endDate" required type="date" className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" /></label></div><label className="flex flex-col gap-2 text-sm font-medium">Reason<textarea name="reason" required rows={4} placeholder="Add a short reason for your request..." className="resize-none rounded-lg border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" /></label>{submitted && <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 /> Request submitted for approval.</p>}<Button type="submit" disabled={applyLeave.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700"><Send data-icon="inline-start" /> {applyLeave.isPending ? "Submitting..." : "Submit request"}</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Leave history & approvals</CardTitle><CardDescription>Your recent requests and their current status.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Leave type</TableHead><TableHead>Dates</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{historyRows.map((item) => <TableRow key={item._id}><TableCell className="font-medium">{item.type}</TableCell><TableCell className="text-muted-foreground">{item.startDate} – {item.endDate}</TableCell><TableCell className="font-mono tabular-nums">{item.days} days</TableCell><TableCell><StatusBadge status={item.status === "approved" ? "active" : item.status === "pending" ? "pending" : "cancelled"} label={item.status} /></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></div>
  </div>;
}
