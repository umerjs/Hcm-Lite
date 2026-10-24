import { useMemo, useState } from "react";
import { Mail, Phone, Plus, Search, UserRound, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";

const employees = [
  { code: "EMP-0024", name: "Ayesha Khan", email: "ayesha.khan@hcm-lite.com", department: "Engineering", status: "active" },
  { code: "EMP-0012", name: "Bilal Ahmed", email: "bilal.ahmed@hcm-lite.com", department: "Operations", status: "active" },
  { code: "EMP-0031", name: "Mariam Raza", email: "mariam.raza@hcm-lite.com", department: "Marketing", status: "active" },
  { code: "EMP-0008", name: "Usman Tariq", email: "usman.tariq@hcm-lite.com", department: "Design", status: "active" },
  { code: "EMP-0019", name: "Sara Malik", email: "sara.malik@hcm-lite.com", department: "Finance", status: "exited" },
  { code: "EMP-0038", name: "Hamza Qureshi", email: "hamza.qureshi@hcm-lite.com", department: "Engineering", status: "active" },
];

const departments = ["All departments", "Engineering", "Operations", "Marketing", "Design", "Finance"];

export default function Employees() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [status, setStatus] = useState("All statuses");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const filtered = useMemo(() => employees.filter((employee) => {
    const matchesQuery = `${employee.name} ${employee.email} ${employee.code}`.toLowerCase().includes(query.toLowerCase());
    const matchesDepartment = department === "All departments" || employee.department === department;
    const matchesStatus = status === "All statuses" || employee.status === status;
    return matchesQuery && matchesDepartment && matchesStatus;
  }), [query, department, status]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-emerald-600">People & culture</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Employees</h1><p className="mt-1 text-sm text-muted-foreground">Manage your workforce, roles, and employee records.</p></div>
        <Button onClick={() => { setSaved(false); setOpen(true); }} className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus data-icon="inline-start" /> Register employee</Button>
      </header>

      <Card>
        <CardHeader className="gap-4 pb-4"><div><CardTitle>Employee directory</CardTitle><CardDescription>{filtered.length} of {employees.length} employees shown</CardDescription></div>
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative min-w-0 flex-1 md:min-w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" /><span className="sr-only">Search employees</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or code" className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-emerald-600" /></label>
            <select aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{departments.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><option>All statuses</option><option value="active">Active</option><option value="exited">Exited</option></select>
          </div>
        </CardHeader>
        <CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Employee code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{filtered.map((employee) => <TableRow key={employee.code}><TableCell className="font-mono text-xs text-muted-foreground">{employee.code}</TableCell><TableCell className="font-medium">{employee.name}</TableCell><TableCell className="text-muted-foreground">{employee.email}</TableCell><TableCell>{employee.department}</TableCell><TableCell><StatusBadge status={employee.status === "exited" ? "cancelled" : "active"} label={employee.status === "exited" ? "Exited" : "Active"} /></TableCell></TableRow>)}</TableBody></Table></div></CardContent>
      </Card>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="register-title"><div className="w-full max-w-2xl rounded-2xl border bg-card shadow-xl"><div className="flex items-start justify-between border-b p-6"><div><h2 id="register-title" className="text-lg font-semibold">Register employee</h2><p className="mt-1 text-sm text-muted-foreground">Add a new employee to your organization directory.</p></div><button onClick={() => setOpen(false)} aria-label="Close dialog" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X /></button></div><form onSubmit={(event) => { event.preventDefault(); setSaved(true); }} className="flex flex-col gap-5 p-6"><div className="grid gap-4 sm:grid-cols-2">{[["Name", "Full name", "text"], ["Email", "name@company.com", "email"], ["Phone", "+92 300 1234567", "tel"], ["Dept", "e.g. Engineering", "text"], ["Designation", "e.g. Product Designer", "text"], ["Basic salary", "100,000", "number"]].map(([label, placeholder, type]) => <label key={label} className="flex flex-col gap-2 text-sm font-medium">{label}<input required={label === "Name" || label === "Email"} type={type} placeholder={placeholder} className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" /></label>)}</div>{saved && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">Employee registered successfully.</p>}<div className="flex justify-end gap-3 border-t pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700"><UserRound data-icon="inline-start" /> Save employee</Button></div></form></div></div>}
    </div>
  );
}
