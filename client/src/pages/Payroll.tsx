import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";
import { http } from "../api/http";
import type { PayrollItem, PayrollRun, Payslip } from "../types/api";

const unwrap = <T,>(value: unknown): T => ((value as { data?: T })?.data ?? value) as T;
const currency = (value: number) => `PKR ${value.toLocaleString("en-PK")}`;

export default function Payroll() {
  const payroll = useQuery({ queryKey: ["payroll"], queryFn: async () => unwrap<PayrollRun | PayrollRun[]>((await http.get("/payroll")).data) });
  const payslips = useQuery({ queryKey: ["payslips"], queryFn: async () => unwrap<Payslip[]>((await http.get("/payroll/payslips")).data) });
  const run = Array.isArray(payroll.data) ? payroll.data[0] : payroll.data;
  const rows: PayrollItem[] = run?.items ?? [];
  const downloadPdf = async (employeeId: string, month: string) => { const response = await http.get(`/payroll/${employeeId}/month/${month}/pdf`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-emerald-600">Finance & compensation</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Payroll</h1><p className="mt-1 text-sm text-muted-foreground">Review this month&apos;s payroll and employee payslips.</p></div><Button variant="destructive" className="gap-2"><ShieldCheck data-icon="inline-start" /> Finalize payroll</Button></header>
    <Card><CardHeader className="border-b"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>{run?.month ?? "Current month"} payroll run</CardTitle><CardDescription>{rows.length} employees · {run?.status ?? "Draft"} review</CardDescription></div><StatusBadge status="pending" label={run?.status ?? "Pending review"} /></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Employee name</TableHead><TableHead className="text-right">Basic salary</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net pay</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.employeeId}><TableCell className="font-medium">{row.employeeName}</TableCell><TableCell className="text-right font-mono tabular-nums">{currency(row.basic)}</TableCell><TableCell className="text-right font-mono tabular-nums">{currency(row.gross)}</TableCell><TableCell className="text-right font-mono tabular-nums text-muted-foreground">{currency(row.deductions + row.tax)}</TableCell><TableCell className="text-right font-mono font-semibold tabular-nums">{currency(row.net)}</TableCell><TableCell><StatusBadge status="active" label="Ready" /></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    <Card><CardHeader><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><FileText /></div><div><CardTitle>My payslips</CardTitle><CardDescription>Download your previous monthly payslips.</CardDescription></div></div></CardHeader><CardContent className="p-0"><div className="divide-y">{(payslips.data ?? []).map((payslip) => <div key={payslip._id} className="flex items-center justify-between gap-4 px-6 py-4"><div><p className="font-medium">{payslip.month}</p><p className="font-mono text-sm tabular-nums text-muted-foreground">{currency(payslip.net)}</p></div><Button variant="ghost" size="sm" className="gap-2" onClick={() => downloadPdf(payslip.employeeId, payslip.month)}><Download data-icon="inline-start" /> Download PDF</Button></div>)}</div></CardContent></Card>
  </div>;
}
