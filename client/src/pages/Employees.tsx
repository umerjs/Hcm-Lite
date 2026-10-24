import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Copy,
  Check,
  X,
  ShieldAlert,
  AlertCircle,
  Building,
} from "lucide-react";
import { http, extractErrorMessage } from "../api/http";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/shared/PageHeader";
import Loading from "../components/shared/Loading";
import EmptyState from "../components/shared/EmptyState";
import StatusBadge from "../components/shared/StatusBadge";
import MoneyText from "../components/shared/MoneyText";
import DateText from "../components/shared/DateText";
import type { Employee, Department, Designation } from "../types/api";

export const Employees: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isHr = role === "hr" || role === "admin";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  // Form states
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [basicSalary, setBasicSalary] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [designationId, setDesignationId] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [status, setStatus] = useState<"active" | "probation">("active");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // One-time credential dialog state
  const [oneTimeCreds, setOneTimeCreds] = useState<{
    code: string;
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: employeeData, isLoading: isLoadingEmployees } = useQuery<{
    data: Employee[];
    pagination?: { total: number };
  }>({
    queryKey: ["employees", searchQuery, selectedDept],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (selectedDept) params.append("departmentId", selectedDept);

      const res = await http.get<{ data: Employee[]; pagination?: any }>(
        `/employees?${params.toString()}`,
      );
      return res.data;
    },
  });

  const employees = employeeData?.data || [];

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await http.get<{ data: Department[] }>("/departments");
      return res.data.data || [];
    },
  });

  const { data: designations = [] } = useQuery<Designation[]>({
    queryKey: ["designations", departmentId],
    queryFn: async () => {
      const url = departmentId ? `/designations?departmentId=${departmentId}` : "/designations";
      const res = await http.get<{ data: Designation[] }>(url);
      return res.data.data || [];
    },
  });

  // ── Mutation: Register Employee ───────────────────────────────────────────
  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await http.post<{
        message: string;
        employee: Employee;
        tempPassword: string;
      }>("/employees", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsModalOpen(false);
      resetForm();

      if (data.tempPassword) {
        setOneTimeCreds({
          code: data.employee.code,
          name: data.employee.name,
          email: data.employee.email,
          tempPassword: data.tempPassword,
        });
      }
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err, "Failed to register employee"));
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setBasicSalary("");
    setDepartmentId("");
    setDesignationId("");
    setGender("male");
    setStatus("active");
    setPhone("");
    setAddress("");
    setFormError("");
  };

  const handleCopyPassword = () => {
    if (!oneTimeCreds) return;
    navigator.clipboard.writeText(oneTimeCreds.tempPassword);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setFormError("Email is required");
      return;
    }
    const salaryNum = parseFloat(basicSalary);
    if (!basicSalary || isNaN(salaryNum) || salaryNum <= 0) {
      setFormError("Basic salary must be greater than 0");
      return;
    }
    if (!departmentId) {
      setFormError("Please select a department");
      return;
    }
    if (!designationId) {
      setFormError("Please select a designation");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    createEmployeeMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      basicSalary: salaryNum,
      departmentId,
      designationId,
      gender,
      status,
      joinDate: todayStr,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        description="Comprehensive directory of staff members, job allocations, and payroll standings."
        actions={
          isHr && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Employee</span>
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full sm:w-56 h-10 px-3 rounded-xl border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Directory Table */}
      {isLoadingEmployees ? (
        <Loading text="Loading employee records..." />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No Employees Found"
          description={
            searchQuery || selectedDept
              ? "No staff members matched your search criteria."
              : "No employees registered yet. Click 'New Employee' to add your first staff member."
          }
        />
      ) : (
        <div className="w-full rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Basic Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => {
                  const deptName =
                    typeof emp.departmentId === "object"
                      ? (emp.departmentId as any)?.name
                      : departments.find((d) => d._id === emp.departmentId)?.name || "Unassigned";

                  const desigName =
                    typeof emp.designationId === "object"
                      ? (emp.designationId as any)?.name
                      : designations.find((d) => d._id === emp.designationId)?.name || "Staff";

                  return (
                    <tr key={emp._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {emp.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-xs text-foreground">
                        {emp.code}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-foreground font-medium text-xs">{desigName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          <span>{deptName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                        <MoneyText amount={emp.basicSalary} />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={emp.status} />
                      </td>

                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <DateText date={emp.joinDate} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Register New Employee ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl p-6 relative my-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">New Employee Registration</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Registers employee record and provisions a linked user login with temporary
              credentials.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ali Khan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    placeholder="ali.khan@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Designation *
                  </label>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Designation</option>
                    {designations.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Basic Salary (PKR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="100000"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+923001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={createEmployeeMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEmployeeMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {createEmployeeMutation.isPending ? "Registering..." : "Register Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Strict One-Time Credential Modal ────────────────────────────── */}
      {oneTimeCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-center text-foreground mb-1">
              Employee Registered
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-5">
              Copy these temporary login credentials now. This password is generated once and will
              not be displayed again.
            </p>

            <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold text-foreground">
                  {oneTimeCreds.name} ({oneTimeCreds.code})
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Login Email:</span>
                <span className="font-semibold text-foreground">{oneTimeCreds.email}</span>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Temporary Password
                </span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-base font-mono font-bold text-primary px-2.5 py-1 rounded-lg bg-background border border-border select-all">
                    {oneTimeCreds.tempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium mb-5">
              Provide these credentials to the employee. They will be required to change their
              password on first sign in.
            </div>

            <button
              type="button"
              onClick={() => setOneTimeCreds(null)}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              I Have Securely Copied This Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
