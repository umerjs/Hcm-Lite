import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, LogIn, LogOut, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";

const records = [
  { date: "Mon, Jun 17", checkIn: "08:54 AM", checkOut: "05:42 PM", status: "Present", hours: "8h 48m" },
  { date: "Fri, Jun 14", checkIn: "09:18 AM", checkOut: "05:31 PM", status: "Late", hours: "8h 13m" },
  { date: "Thu, Jun 13", checkIn: "08:57 AM", checkOut: "05:45 PM", status: "Present", hours: "8h 48m" },
  { date: "Wed, Jun 12", checkIn: "—", checkOut: "—", status: "On leave", hours: "—" },
  { date: "Tue, Jun 11", checkIn: "09:01 AM", checkOut: "05:36 PM", status: "Present", hours: "8h 35m" },
];

const roster = [
  { name: "Ayesha Khan", checkIn: "08:54 AM", status: "Present", hours: "8h 48m" },
  { name: "Bilal Ahmed", checkIn: "09:18 AM", status: "Late", hours: "8h 13m" },
  { name: "Mariam Raza", checkIn: "08:47 AM", status: "Present", hours: "8h 56m" },
  { name: "Usman Tariq", checkIn: "—", status: "On leave", hours: "—" },
  { name: "Hamza Qureshi", checkIn: "09:02 AM", status: "Present", hours: "8h 41m" },
];

function AttendanceStatus({ status }: { status: string }) {
  const mapped = status === "Present" ? "active" : status === "Late" ? "pending" : "on_leave";
  return <StatusBadge status={mapped} label={status} />;
}

export default function Attendance() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [department, setDepartment] = useState("All departments");
  return <div className="flex flex-col gap-6">
    <header><p className="text-sm font-medium text-emerald-600">Time & presence</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Attendance</h1><p className="mt-1 text-sm text-muted-foreground">Track your workday and review team attendance in one place.</p></header>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="overflow-hidden"><div className="bg-emerald-600 p-6 text-white"><div className="flex items-center justify-between"><div><p className="text-sm text-emerald-100">Your workday</p><p className="mt-2 text-4xl font-semibold tabular-nums">09:24:18 AM</p><p className="mt-1 text-sm text-emerald-100">Monday, June 17, 2024</p></div><Clock3 className="size-9 text-emerald-100" /></div></div><CardContent className="flex flex-col gap-5 p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">{checkedIn ? "Checked in" : "Ready to check in"}</p><p className="mt-1 text-sm text-muted-foreground">{checkedIn ? "Started at 09:24 AM" : "Your scheduled start is 09:00 AM"}</p></div><StatusBadge status={checkedIn ? "active" : "pending"} label={checkedIn ? "On time" : "Not started"} /></div><Button onClick={() => setCheckedIn(!checkedIn)} className="h-14 bg-emerald-600 text-base text-white hover:bg-emerald-700">{checkedIn ? <LogOut data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}{checkedIn ? "Check out" : "Check in"}</Button><div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4 text-sm"><div><p className="text-muted-foreground">Today&apos;s status</p><p className="mt-1 font-medium">{checkedIn ? "Present" : "Pending"}</p></div><div><p className="text-muted-foreground">Grace period</p><p className="mt-1 font-mono tabular-nums font-medium">15 minutes</p></div></div></CardContent></Card>
      <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>HR attendance board</CardTitle><CardDescription>Review everyone&apos;s attendance for a selected day.</CardDescription></div><Users className="text-emerald-600" /></div><div className="flex flex-col gap-3 pt-2 sm:flex-row"><label className="flex flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">Date<input type="date" defaultValue="2024-06-17" className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" /></label><label className="flex flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">Department<select value={department} onChange={(e) => setDepartment(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><option>All departments</option><option>Engineering</option><option>Operations</option><option>Marketing</option></select></label></div></CardHeader><CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Check-in</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Worked hours</TableHead></TableRow></TableHeader><TableBody>{roster.map((item) => <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="font-mono tabular-nums text-sm">{item.checkIn}</TableCell><TableCell><AttendanceStatus status={item.status} /></TableCell><TableCell className="text-right font-mono tabular-nums">{item.hours}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </div>
    <Card><CardHeader><div className="flex items-center gap-3"><CalendarDays className="text-emerald-600" /><div><CardTitle>My attendance history</CardTitle><CardDescription>Daily records for the current month.</CardDescription></div></div></CardHeader><CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Worked hours</TableHead></TableRow></TableHeader><TableBody>{records.map((item) => <TableRow key={item.date}><TableCell className="font-medium">{item.date}</TableCell><TableCell className="font-mono tabular-nums">{item.checkIn}</TableCell><TableCell className="font-mono tabular-nums">{item.checkOut}</TableCell><TableCell><AttendanceStatus status={item.status} /></TableCell><TableCell className="text-right font-mono tabular-nums">{item.hours}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
  </div>;
}
