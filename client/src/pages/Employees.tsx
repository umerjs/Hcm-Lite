import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, UserRound, X, Check } from "lucide-react";
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
import type {
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  Department,
  Employee,
  GetEmployeesResponse,
} from "../types/api";

type RegisterForm = CreateEmployeeRequest;
const unwrap = <T,>(value: T | { data: T }): T =>
  (typeof value === "object" && value !== null && "data" in value ? (value as any).data : value) as T;

export default function Employees() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [status, setStatus] = useState("All statuses");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [credentials, setCredentials] = useState<string | null>(null);

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    gender: "other",
    departmentId: "",
    designationId: "",
    joinDate: new Date().toISOString().slice(0, 10),
    basicSalary: 0,
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", query, department, status],
    queryFn: async () =>
      unwrap<GetEmployeesResponse>(
        await http
          .get<GetEmployeesResponse>("/employees", {
            params: {
              q: query || undefined,
              departmentId: department === "All departments" ? undefined : department,
              status: status === "All statuses" ? undefined : status,
              page: 1,
              pageSize: 100,
            },
          })
          .then((response) => response.data),
      ),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      unwrap<Department[]>(
        await http.get<Department[] | { data: Department[] }>("/departments").then((response) => response.data),
      ),
  });

  const createEmployee = useMutation({
    mutationFn: async (payload: RegisterForm) =>
      http.post<CreateEmployeeResponse>("/employees", payload).then((response) => unwrap(response.data)),
    onSuccess: (response) => {
      setCredentials(response.tempPassword);
      setOpen(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        gender: "other",
        departmentId: "",
        designationId: "",
        joinDate: new Date().toISOString().slice(0, 10),
        basicSalary: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const employees = employeesQuery.data?.data ?? [];
  const departments = departmentsQuery.data ?? [];

  const visibleEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const employeeDepartment =
          typeof employee.departmentId === "string"
            ? employee.departmentId
            : employee.departmentId?.name || "";
        return (
          (department === "All departments" || employeeDepartment === department) &&
          (status === "All statuses" || employee.status === status)
        );
      }),
    [employees, department, status],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createEmployee.mutate(form);
  };

  const update = (key: keyof RegisterForm, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }));

  const copyCredentials = () => {
    if (credentials) {
      navigator.clipboard.writeText(credentials);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-emerald-600">People & culture</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Employees</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage your workforce, roles, and employee records.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700 w-full sm:w-auto self-start"
        >
          <Plus className="mr-2 h-4 w-4" /> Register employee
        </Button>
      </header>

      <Card>
        <CardHeader className="gap-4 pb-4">
          <div>
            <CardTitle>Employee directory</CardTitle>
            <CardDescription>
              {visibleEmployees.length} of {employees.length} employees shown
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative min-w-0 flex-1 md:min-w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <span className="sr-only">Search employees</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, email, or code"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs sm:text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-emerald-600"
              />
            </label>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                aria-label="Department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-10 flex-1 md:flex-initial rounded-lg border border-input bg-background px-3 text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <option>All departments</option>
                {departments.map((item) => (
                  <option key={item._id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 flex-1 md:flex-initial rounded-lg border border-input bg-background px-3 text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <option>All statuses</option>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="exited">Exited</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employeesQuery.isLoading ? (
            <div className="py-12">
              <Loading text="Loading employee directory..." />
            </div>
          ) : visibleEmployees.length === 0 ? (
            <EmptyState
              title="No employees found"
              message="No records match your search query or selected department filter."
            />
          ) : (
            <div className="overflow-x-auto w-full rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEmployees.map((employee: Employee) => (
                    <TableRow key={employee._id}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {employee.code}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                        {employee.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm">
                        {employee.email}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {typeof employee.departmentId === "string"
                          ? employee.departmentId
                          : employee.departmentId?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={employee.status === "exited" ? "cancelled" : "active"}
                          label={employee.status === "exited" ? "Exited" : employee.status}
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

      {/* Registration Modal Dialog (Mobile 375px optimized) */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 sticky top-0 bg-card z-10">
              <div>
                <h2 id="register-title" className="text-base sm:text-lg font-semibold">
                  Register employee
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Provisions employee profile and initial portal credentials.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {(
                  [
                    ["name", "Full Name", "e.g. Sarah Khan", "text"],
                    ["email", "Email Address", "name@saylani.org", "email"],
                    ["phone", "Phone Number", "+92 300 1234567", "tel"],
                    ["departmentId", "Department ID", "Paste Department ObjectId", "text"],
                    ["designationId", "Designation ID", "Paste Designation ObjectId", "text"],
                    ["basicSalary", "Basic Salary (PKR)", "100000", "number"],
                  ] as const
                ).map(([key, label, placeholder, type]) => (
                  <label key={key} className="flex flex-col gap-1.5 text-xs sm:text-sm font-medium">
                    {label}
                    <input
                      required={key === "name" || key === "email" || key === "basicSalary"}
                      type={type}
                      value={String(form[key])}
                      onChange={(event) =>
                        update(
                          key,
                          type === "number" ? Number(event.target.value) : event.target.value,
                        )
                      }
                      placeholder={placeholder}
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 text-xs sm:text-sm"
                    />
                  </label>
                ))}
              </div>

              {createEmployee.isError && (
                <p className="text-xs text-destructive font-medium bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                  Unable to register employee. Ensure Department and Designation IDs exist.
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEmployee.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  {createEmployee.isPending ? "Registering..." : "Save employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Password Modal (Strict One-time dialog) */}
      {credentials && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="password-title" className="text-base sm:text-lg font-semibold text-foreground">
              Employee Registered Successfully
            </h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              This one-time temporary password will not be shown again. Please copy and provide it
              securely to the employee:
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-3 font-mono text-sm">
              <span className="flex-1 font-bold tracking-wider text-emerald-600 dark:text-emerald-400 select-all">
                {credentials}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={copyCredentials}>
                {copied ? <Check className="h-4 w-4 text-emerald-600 mr-1" /> : null}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button
              className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setCredentials(null)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
