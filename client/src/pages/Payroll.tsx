import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import { http } from "../api/http";
import type { PayrollItem, PayrollRun, Payslip } from "../types/api";

const unwrap = <T,>(value: unknown): T => ((value as { data?: T })?.data ?? value) as T;
const currency = (value: number) => `PKR ${value.toLocaleString("en-PK")}`;

export default function Payroll() {
  const payroll = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => unwrap<PayrollRun | PayrollRun[]>((await http.get("/payroll")).data),
  });

  const payslips = useQuery({
    queryKey: ["payslips"],
    queryFn: async () => unwrap<Payslip[]>((await http.get("/payroll/payslips")).data),
  });

  const run = Array.isArray(payroll.data) ? payroll.data[0] : payroll.data;
  const rawPayroll = payroll.data;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const rows: PayrollItem[] = Array.isArray(rawPayroll)
    ? rawPayroll
    : (rawPayroll as any)?.items || (rawPayroll as any)?.data || [];
  const payslipList: Payslip[] = payslips.data ?? [];

  const downloadPdf = async (employeeId: string, month: string) => {
    try {
      const response = await http.get(`/payroll/${employeeId}/month/${month}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${employeeId}-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert("Unable to generate payslip PDF. Ensure the employee has active payroll calculations.");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-emerald-600">Finance & compensation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review monthly calculations, tax deductions, and download signed payslips.
          </p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto self-start">
          <ShieldCheck className="h-4 w-4" /> Finalize payroll run
        </Button>
      </header>

      {/* Payroll Summary Run Table */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{run?.month ?? "Current month"} payroll run</CardTitle>
              <CardDescription>
                {rows.length} {rows.length === 1 ? "employee" : "employees"} ·{" "}
                {run?.status ?? "Draft"} status
              </CardDescription>
            </div>
            <StatusBadge
              status={run?.status === "finalized" ? "active" : "pending"}
              label={run?.status ?? "Draft"}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payroll.isLoading ? (
            <div className="py-12">
              <Loading text="Loading payroll calculations..." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No payroll records"
                message="Payroll has not been calculated for the current period yet."
              />
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Gross (1.5x)</TableHead>
                    <TableHead className="text-right">Deductions & Tax</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Payslip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: any) => {
                    const empId = row.employeeId || row.employee?._id || row._id;
                    const empName = row.employeeName || row.employee?.name || "Employee";
                    const rowMonth = row.month || currentMonth;
                    return (
                      <TableRow key={empId}>
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                          {empName}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-xs sm:text-sm">
                          {currency(row.basic)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-xs sm:text-sm">
                          {currency(row.gross)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground text-xs sm:text-sm">
                          {currency(row.deductions + row.tax)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums text-xs sm:text-sm">
                          {currency(row.net)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status="active" label="Calculated" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            onClick={() => downloadPdf(empId, rowMonth)}
                          >
                            <Download className="size-3.5" /> PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Payslips Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileText className="size-5" />
            </div>
            <div>
              <CardTitle>My payslips</CardTitle>
              <CardDescription>
                Download and verify your monthly compensation statements.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payslips.isLoading ? (
            <div className="py-8">
              <Loading text="Loading payslips..." />
            </div>
          ) : payslipList.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No payslips available"
                message="Monthly payslips will be generated once payroll is finalized."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payslipList.map((payslip) => (
                <div
                  key={payslip._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium text-xs sm:text-sm">{payslip.month}</p>
                    <p className="font-mono text-xs sm:text-sm tabular-nums text-muted-foreground">
                      Net: {currency(payslip.net)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full sm:w-auto self-start"
                    onClick={() => downloadPdf(payslip.employeeId, payslip.month)}
                  >
                    <Download className="size-4" /> Download PDF
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
