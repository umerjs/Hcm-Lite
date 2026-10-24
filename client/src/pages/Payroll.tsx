import { Download, FileText, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";

const payrollRows = [
  { name: "Ayesha Khan", basic: 150000, gross: 225000, deductions: 12500, net: 212500, status: "Ready" },
  { name: "Bilal Ahmed", basic: 125000, gross: 187500, deductions: 8500, net: 179000, status: "Ready" },
  { name: "Hira Shah", basic: 180000, gross: 270000, deductions: 18000, net: 252000, status: "Review" },
  { name: "Omar Farooq", basic: 95000, gross: 142500, deductions: 6500, net: 136000, status: "Ready" },
  { name: "Sara Malik", basic: 135000, gross: 202500, deductions: 10000, net: 192500, status: "Ready" },
];

const payslips = [
  { month: "May 2024", net: 192500 },
  { month: "April 2024", net: 192500 },
  { month: "March 2024", net: 192500 },
  { month: "February 2024", net: 190000 },
];

const currency = (value: number) => `PKR ${value.toLocaleString("en-PK")}`;

export default function Payroll() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Finance & compensation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review this month&apos;s payroll and employee payslips.</p>
        </div>
        <Button variant="destructive" className="gap-2"><ShieldCheck data-icon="inline-start" /> Finalize payroll</Button>
      </header>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>May 2024 payroll run</CardTitle><CardDescription>5 employees · Draft review</CardDescription></div>
            <StatusBadge status="pending" label="Pending review" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Employee name</TableHead><TableHead className="text-right">Basic salary</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net pay</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>{payrollRows.map((row) => <TableRow key={row.name}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{currency(row.basic)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{currency(row.gross)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{currency(row.deductions)}</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">{currency(row.net)}</TableCell>
                <TableCell><StatusBadge status={row.status === "Ready" ? "active" : "pending"} label={row.status} /></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><FileText /></div><div><CardTitle>My payslips</CardTitle><CardDescription>Download your previous monthly payslips.</CardDescription></div></div></CardHeader>
        <CardContent className="p-0"><div className="divide-y">
          {payslips.map((payslip) => <div key={payslip.month} className="flex items-center justify-between gap-4 px-6 py-4"><div><p className="font-medium">{payslip.month}</p><p className="font-mono text-sm tabular-nums text-muted-foreground">{currency(payslip.net)}</p></div><Button variant="ghost" size="sm" className="gap-2"><Download data-icon="inline-start" /> Download PDF</Button></div>)}
        </div></CardContent>
      </Card>
    </div>
  );
}
