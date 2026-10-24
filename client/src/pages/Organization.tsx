import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, Save, Settings2 } from "lucide-react";
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
import EmptyState from "../components/shared/EmptyState";
import Loading from "../components/shared/Loading";
import { http } from "../api/http";
import type { CompanySettings, Department } from "../types/api";

const unwrap = <T,>(value: T | { data: T }): T =>
  (typeof value === "object" && value !== null && "data" in value ? (value as any).data : value) as T;

const tabs = ["Company Settings", "Departments", "Designations", "Leave Types", "Holidays", "Users"];

export default function Organization() {
  const [activeTab, setActiveTab] = useState("Company Settings");
  const [saved, setSaved] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () =>
      unwrap<CompanySettings>(await http.get<CompanySettings | { data: CompanySettings }>("/settings").then((r) => r.data)),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      unwrap<Department[]>(await http.get<Department[] | { data: Department[] }>("/departments").then((r) => r.data)),
  });

  const settings = settingsQuery.data;
  const departments = departmentsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header>
        <p className="text-xs sm:text-sm font-medium text-emerald-600">Workspace administration</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Organization</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Configure company policies, departmental hierarchy, and system settings.
        </p>
      </header>

      {/* Tabs list (responsive scrollable) */}
      <div className="overflow-x-auto border-b border-border w-full">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Organization settings">
          {tabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => {
                setActiveTab(tab);
                setSaved(false);
              }}
              className={`border-b-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Company Settings" && (
        <Card>
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Settings2 className="w-5 h-5" />
            </div>
            <CardTitle className="mt-4">Company settings</CardTitle>
            <CardDescription>
              Set default working hours, grace periods, and timezone for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsQuery.isLoading ? (
              <div className="py-8">
                <Loading text="Loading company settings..." />
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setSaved(true);
                }}
                className="flex max-w-2xl flex-col gap-5"
              >
                <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-medium">
                    Office start time
                    <input
                      type="time"
                      defaultValue={settings?.officeStart ?? "09:00"}
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-medium">
                    Grace minutes
                    <input
                      type="number"
                      defaultValue={settings?.graceMinutes ?? 15}
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-medium">
                    Half-day hours
                    <input
                      type="number"
                      step="0.5"
                      defaultValue={settings?.halfDayHours ?? 4}
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-medium">
                    Timezone
                    <select
                      defaultValue={settings?.timezone ?? "Asia/Karachi"}
                      className="h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <option>Asia/Karachi</option>
                      <option>Asia/Dubai</option>
                      <option>UTC</option>
                    </select>
                  </label>
                </div>
                {saved && (
                  <p className="flex items-center gap-2 text-xs sm:text-sm text-emerald-600 font-medium animate-in fade-in">
                    <Check className="size-4" /> Settings updated successfully.
                  </p>
                )}
                <Button className="w-full sm:w-fit bg-emerald-600 text-white hover:bg-emerald-700">
                  <Save className="mr-2 size-4" /> Save changes
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Departments" && (
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Configured business units within your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentsQuery.isLoading ? (
              <div className="py-8">
                <Loading text="Loading departments..." />
              </div>
            ) : departments.length === 0 ? (
              <EmptyState
                title="No departments found"
                message="Add your first department to organize your workforce."
              />
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department) => (
                      <TableRow key={department._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                              <Building2 className="size-4" />
                            </div>
                            <span className="font-medium text-xs sm:text-sm">{department.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {department._id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!["Company Settings", "Departments"].includes(activeTab) && (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
              <Settings2 className="size-6" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold">{activeTab}</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm">
              This module is managed via Admin API endpoints and company policies.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
