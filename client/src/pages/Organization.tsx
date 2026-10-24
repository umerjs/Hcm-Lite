import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Briefcase,
  UserCheck,
  Plus,
  Copy,
  Check,
  X,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { http, extractErrorMessage } from "../api/http";
import PageHeader from "../components/shared/PageHeader";
import Loading from "../components/shared/Loading";
import EmptyState from "../components/shared/EmptyState";
import StatusBadge from "../components/shared/StatusBadge";
import type { Department, Designation, AuthUser } from "../types/api";

type TabType = "departments" | "designations" | "hr-users";

export const Organization: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("departments");

  // Modal states
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [isDesigModalOpen, setIsDesigModalOpen] = useState<boolean>(false);
  const [isHrModalOpen, setIsHrModalOpen] = useState<boolean>(false);

  // Form states
  const [deptName, setDeptName] = useState<string>("");
  const [desigName, setDesigName] = useState<string>("");
  const [desigDeptId, setDesigDeptId] = useState<string>("");

  const [hrFirstname, setHrFirstname] = useState<string>("");
  const [hrLastname, setHrLastname] = useState<string>("");
  const [hrEmail, setHrEmail] = useState<string>("");

  const [formError, setFormError] = useState<string>("");

  // One-time credential dialog state for newly created HR accounts
  const [oneTimeCreds, setOneTimeCreds] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await http.get<{ data: Department[] }>("/departments");
      return res.data.data || [];
    },
  });

  const { data: designations = [], isLoading: isLoadingDesigs } = useQuery<Designation[]>({
    queryKey: ["designations"],
    queryFn: async () => {
      const res = await http.get<{ data: Designation[] }>("/designations");
      return res.data.data || [];
    },
  });

  const { data: hrUsers = [], isLoading: isLoadingHr } = useQuery<AuthUser[]>({
    queryKey: ["hr-users"],
    queryFn: async () => {
      const res = await http.get<{ data: AuthUser[] }>("/users?role=hr");
      return res.data.data || [];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createDeptMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await http.post("/departments", { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setIsDeptModalOpen(false);
      setDeptName("");
      setFormError("");
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err, "Failed to create department"));
    },
  });

  const createDesigMutation = useMutation({
    mutationFn: async ({ name, departmentId }: { name: string; departmentId?: string }) => {
      const res = await http.post("/designations", {
        name,
        departmentId: departmentId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
      setIsDesigModalOpen(false);
      setDesigName("");
      setDesigDeptId("");
      setFormError("");
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err, "Failed to create designation"));
    },
  });

  const createHrMutation = useMutation({
    mutationFn: async (payload: { firstname: string; lastname: string; email: string }) => {
      const res = await http.post<{ user: AuthUser; tempPassword: string }>("/users/hr", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr-users"] });
      setIsHrModalOpen(false);
      setHrFirstname("");
      setHrLastname("");
      setHrEmail("");
      setFormError("");

      // Trigger the one-time temporary password alert dialog
      if (data.tempPassword) {
        setOneTimeCreds({
          email: data.user.email,
          tempPassword: data.tempPassword,
        });
      }
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err, "Failed to create HR account"));
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCopyPassword = () => {
    if (!oneTimeCreds) return;
    navigator.clipboard.writeText(oneTimeCreds.tempPassword);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      setFormError("Department name is required");
      return;
    }
    createDeptMutation.mutate(deptName.trim());
  };

  const handleCreateDesig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigName.trim()) {
      setFormError("Designation name is required");
      return;
    }
    createDesigMutation.mutate({
      name: desigName.trim(),
      departmentId: desigDeptId || undefined,
    });
  };

  const handleCreateHr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrFirstname.trim() || !hrLastname.trim() || !hrEmail.trim()) {
      setFormError("All fields (first name, last name, email) are required");
      return;
    }
    createHrMutation.mutate({
      firstname: hrFirstname.trim(),
      lastname: hrLastname.trim(),
      email: hrEmail.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Configure corporate departments, professional designations, and HR administrative accounts."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("departments")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === "departments"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("designations")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === "designations"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Designations ({designations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hr-users")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === "hr-users"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>HR Managers ({hrUsers.length})</span>
        </button>
      </div>

      {/* Tab 1: Departments */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Company Departments</h2>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setDeptName("");
                setIsDeptModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          {isLoadingDepts ? (
            <Loading text="Loading departments..." />
          ) : departments.length === 0 ? (
            <EmptyState
              title="No Departments Created"
              description="Establish your first organizational department to start structuring staff."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <div
                  key={dept._id}
                  className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{dept.name}</h3>
                      <p className="text-xs text-muted-foreground">ID: {dept._id.slice(-6)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Designations */}
      {activeTab === "designations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Professional Designations</h2>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setDesigName("");
                setDesigDeptId("");
                setIsDesigModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Add Designation</span>
            </button>
          </div>

          {isLoadingDesigs ? (
            <Loading text="Loading designations..." />
          ) : designations.length === 0 ? (
            <EmptyState
              title="No Designations Created"
              description="Add job designations to map positions across your company."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {designations.map((desig) => {
                const assignedDept = departments.find((d) => d._id === desig.departmentId);
                return (
                  <div
                    key={desig._id}
                    className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{desig.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {assignedDept ? assignedDept.name : "All Departments"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: HR Managers */}
      {activeTab === "hr-users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Human Resources Managers</h2>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setHrFirstname("");
                setHrLastname("");
                setHrEmail("");
                setIsHrModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Add HR User</span>
            </button>
          </div>

          {isLoadingHr ? (
            <Loading text="Loading HR accounts..." />
          ) : hrUsers.length === 0 ? (
            <EmptyState
              title="No HR Users Registered"
              description="Create an HR manager account to delegate employee onboarding and approvals."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hrUsers.map((u) => (
                <div
                  key={u.id || (u as any)._id}
                  className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-start justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {u.firstname} {u.lastname}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-1.5">{u.email}</p>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status="active" label="HR Access" />
                        {u.mustChangePassword && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                            Pending Password Change
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Add Department ────────────────────────────────────────── */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4">Add New Department</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Finance, Operations"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  disabled={createDeptMutation.isPending}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDeptMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {createDeptMutation.isPending ? "Creating..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Designation ───────────────────────────────────────── */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsDesigModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4">Add New Designation</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDesig} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Designation Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={desigName}
                  onChange={(e) => setDesigName(e.target.value)}
                  disabled={createDesigMutation.isPending}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Department (Optional)
                </label>
                <select
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                  disabled={createDesigMutation.isPending}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Departments (General)</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDesigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDesigMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {createDesigMutation.isPending ? "Creating..." : "Save Designation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add HR User ───────────────────────────────────────────── */}
      {isHrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsHrModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4">Provision HR Account</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateHr} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="Sarah"
                    value={hrFirstname}
                    onChange={(e) => setHrFirstname(e.target.value)}
                    disabled={createHrMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Connor"
                    value={hrLastname}
                    onChange={(e) => setHrLastname(e.target.value)}
                    disabled={createHrMutation.isPending}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  placeholder="sarah.hr@company.com"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  disabled={createHrMutation.isPending}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHrModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createHrMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {createHrMutation.isPending ? "Provisioning..." : "Create HR Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Strict One-Time Credential Modal for HR User ─────────────────── */}
      {oneTimeCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-center text-foreground mb-1">
              HR Account Created
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-5">
              Copy these temporary login credentials now. The password will not be shown again.
            </p>

            <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border mb-5">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Email Login
                </span>
                <span className="text-sm font-medium text-foreground">{oneTimeCreds.email}</span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Temporary Password
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
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
              The user will be required to create a new password upon their first sign in.
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

export default Organization;
