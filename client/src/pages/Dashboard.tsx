import { useState } from "react";
import { ArrowUpRight, CalendarCheck2, Check, Clock3, FileCheck2, Users, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { StatCard, StatusBadge } from "../components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const attendanceData = [
  { department: "Engineering", present: 17, late: 2 },
  { department: "Design", present: 8, late: 1 },
  { department: "Marketing", present: 9, late: 0 },
  { department: "Operations", present: 8, late: 1 },
];

const lateComers = [
  { code: "EMP-0024", name: "Ayesha Khan", department: "Engineering", count: 6 },
  { code: "EMP-0012", name: "Bilal Ahmed", department: "Operations", count: 4 },
  { code: "EMP-0031", name: "Mariam Raza", department: "Marketing", count: 3 },
  { code: "EMP-0008", name: "Usman Tariq", department: "Engineering", count: 3 },
  { code: "EMP-0019", name: "Sara Malik", department: "Design", count: 2 },
];

const chartTooltip = { contentStyle: { borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" } };

export default function Dashboard() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Friday, October 25, 2026</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Good morning, Sarah</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your organization today.</p>
        </div>
        <Button variant="outline" className="w-fit gap-2"><ArrowUpRight data-icon="inline-start" /> View reports</Button>
      </header>

      <section aria-label="Workforce overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total employees" value={<span className="tabular-nums">48</span>} subtitle="Active workforce" icon={Users} />
        <StatCard title="Present today" value={<span className="tabular-nums">42</span>} subtitle="87.5% attendance rate" icon={CalendarCheck2} />
        <StatCard title="On leave" value={<span className="tabular-nums">3</span>} subtitle="Across 2 departments" icon={Clock3} />
        <StatCard title="Pending approvals" value={<span className="tabular-nums">5</span>} subtitle="Needs your attention" icon={FileCheck2} />
      </section>

      {!dismissed && <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"><Check className="mt-0.5 size-4 shrink-0" /><p><strong>Attendance is looking healthy.</strong> 42 employees have checked in today, up 8% from last Friday.</p><button aria-label="Dismiss attendance insight" onClick={() => setDismissed(true)} className="ml-auto rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"><X className="size-4" /></button></div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle><CardDescription>Keep your team&apos;s day moving.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Your attendance</p><p className="mt-3 text-3xl font-bold tabular-nums">{checkedIn ? "09:04" : "--:--"}</p><p className="mt-1 text-sm text-muted-foreground">{checkedIn ? "Checked in · On time" : "Not checked in yet"}</p></div>
            <Button onClick={() => setCheckedIn((value) => !value)} className="h-16 rounded-xl bg-emerald-600 text-base font-bold text-white shadow-sm hover:bg-emerald-700">{checkedIn ? "Check out" : "Check in"}</Button>
            <div className="grid grid-cols-2 gap-3"><Button variant="outline" className="h-auto flex-col items-start gap-1 py-3"><span className="text-xs text-muted-foreground">Leave balance</span><span className="text-base font-semibold tabular-nums">12 days</span></Button><Button variant="outline" className="h-auto flex-col items-start gap-1 py-3"><span className="text-xs text-muted-foreground">This week</span><span className="text-base font-semibold tabular-nums">38.5 hrs</span></Button></div>
          </CardContent>
        </Card>

        <Card className="min-w-0"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Attendance by department</CardTitle><CardDescription>Today&apos;s check-in distribution</CardDescription></div><StatusBadge status="present" label="87.5% present" /></CardHeader><CardContent><div className="h-[285px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={8}><CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="department" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip cursor={{ fill: "hsl(var(--muted))" }} {...chartTooltip} /><Bar dataKey="present" name="Present" fill="#059669" radius={[5, 5, 0, 0]} /><Bar dataKey="late" name="Late" fill="#f59e0b" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="mt-4 flex gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600" /> Present</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-amber-500" /> Late</span></div></CardContent></Card>
      </section>

      <Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Top late comers</CardTitle><CardDescription>Employees with the most late arrivals this month</CardDescription></div><Button variant="ghost" size="sm">View attendance <ArrowUpRight data-icon="inline-end" /></Button></CardHeader><CardContent><div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Employee code</TableHead><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Late count</TableHead></TableRow></TableHeader><TableBody>{lateComers.map((employee) => <TableRow key={employee.code}><TableCell className="font-mono text-xs text-muted-foreground">{employee.code}</TableCell><TableCell className="font-medium">{employee.name}</TableCell><TableCell className="text-muted-foreground">{employee.department}</TableCell><TableCell className="text-right"><StatusBadge status="late" label={`${employee.count} ${employee.count === 1 ? "time" : "times"}`} /></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}
