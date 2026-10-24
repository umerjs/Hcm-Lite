import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, LogIn, LogOut, Users } from "lucide-react";
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
import type { AttendanceBoardItem, AttendanceSummaryItem, Department } from "../types/api";

const unwrap = <T,>(value: T | { data: T }): T =>
  (typeof value === "object" && value !== null && "data" in value ? (value as any).data : value) as T;

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

const statusLabel = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function AttendanceStatus({ status }: { status: string }) {
  return (
    <StatusBadge
      status={status === "present" ? "active" : status === "on_leave" ? "on_leave" : "pending"}
      label={statusLabel(status)}
    />
  );
}

export default function Attendance() {
  const queryClient = useQueryClient();
  const [department, setDepartment] = useState("All departments");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      unwrap<Department[]>((await http.get<Department[]>("/departments")).data),
  });

  const summaryQuery = useQuery({
    queryKey: ["attendance", "summary"],
    queryFn: async () =>
      unwrap<AttendanceSummaryItem[]>((await http.get<AttendanceSummaryItem[]>("/attendance/my")).data),
  });

  const boardQuery = useQuery({
    queryKey: ["attendance", "board", date, department],
    queryFn: async () =>
      unwrap<AttendanceBoardItem[]>(
        (
          await http.get<AttendanceBoardItem[]>("/attendance/board", {
            params: {
              date,
              departmentId: department === "All departments" ? undefined : department,
            },
          })
        ).data,
      ),
  });

  const checkIn = useMutation({
    mutationFn: () => http.post("/attendance/check-in"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const checkOut = useMutation({
    mutationFn: () => http.post("/attendance/check-out"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const today = summaryQuery.data?.find((item) => item.date === date);
  const checkedIn = Boolean(today?.checkIn && !today.checkOut);
  const board = boardQuery.data ?? [];
  const historyList = summaryQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header>
        <p className="text-xs sm:text-sm font-medium text-emerald-600">Time & presence</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Track your workday and review team attendance in one place.
        </p>
      </header>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Workday Punch Card */}
        <Card className="overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-emerald-100">Your workday</p>
                <p className="mt-2 text-3xl sm:text-4xl font-semibold tabular-nums">
                  {new Date().toLocaleTimeString()}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-emerald-100">{date}</p>
              </div>
              <Clock3 className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {checkedIn ? "Checked in" : "Ready to check in"}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {today?.checkIn
                    ? `Started at ${formatTime(today.checkIn)}`
                    : "Standard office check-in with grace period tracking"}
                </p>
              </div>
              <AttendanceStatus status={today?.status ?? "none"} />
            </div>
            <Button
              disabled={checkIn.isPending || checkOut.isPending}
              onClick={() => (checkedIn ? checkOut.mutate() : checkIn.mutate())}
              className="h-12 sm:h-14 bg-emerald-600 text-sm sm:text-base text-white hover:bg-emerald-700"
            >
              {checkedIn ? <LogOut className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />}
              {checkedIn ? "Check out" : "Check in"}
            </Button>
          </CardContent>
        </Card>

        {/* HR Attendance Board */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>HR attendance board</CardTitle>
                <CardDescription>Review attendance for a selected day.</CardDescription>
              </div>
              <Users className="text-emerald-600 w-5 h-5 shrink-0" />
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Department
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <option>All departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {boardQuery.isLoading ? (
              <div className="py-8">
                <Loading text="Loading daily board..." />
              </div>
            ) : board.length === 0 ? (
              <EmptyState
                title="No attendance records"
                message="No check-ins recorded for the selected date and filter."
              />
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Worked hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {board.map((item) => (
                      <TableRow key={item.employee._id}>
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                          {item.employee.name}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-xs sm:text-sm">
                          {formatTime(item.checkIn)}
                        </TableCell>
                        <TableCell>
                          <AttendanceStatus status={item.status} />
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-xs sm:text-sm">
                          —
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

      {/* Personal Attendance History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CalendarDays className="text-emerald-600 w-5 h-5 shrink-0" />
            <div>
              <CardTitle>My attendance history</CardTitle>
              <CardDescription>Daily activity records from the attendance API.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summaryQuery.isLoading ? (
            <div className="py-8">
              <Loading text="Loading attendance history..." />
            </div>
          ) : historyList.length === 0 ? (
            <EmptyState
              title="No history recorded"
              message="Your check-in and check-out logs will appear here."
            />
          ) : (
            <div className="overflow-x-auto w-full rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Worked hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyList.map((item) => (
                    <TableRow key={item.date}>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {item.date}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-xs sm:text-sm">
                        {formatTime(item.checkIn)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-xs sm:text-sm">
                        {formatTime(item.checkOut)}
                      </TableCell>
                      <TableCell>
                        <AttendanceStatus status={item.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs sm:text-sm">
                        {item.workedHours ?? "—"}
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
  );
}
