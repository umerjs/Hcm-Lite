import { FormEvent, type ReactNode, useState } from "react";
import { Bell, ChevronDown, Megaphone, Save, Send, ShieldCheck, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import StatusBadge from "../components/shared/StatusBadge";

const announcements = [
  {
    id: "a1",
    title: "Annual team retreat",
    date: "Jun 18, 2025",
    body: "Our annual team retreat is scheduled for July 12. More details will follow shortly.",
    by: "Ayesha Khan",
  },
  {
    id: "a2",
    title: "Updated attendance policy",
    date: "Jun 12, 2025",
    body: "Please review the updated attendance and late arrival policy in the employee handbook.",
    by: "HR Team",
  },
  {
    id: "a3",
    title: "Payroll processing date",
    date: "Jun 01, 2025",
    body: "This month’s payroll will be processed on the final working day of the month.",
    by: "Finance",
  },
];

const notifications = [
  {
    id: "n1",
    title: "Leave request approved",
    text: "Your casual leave request for Jun 20 was approved.",
    date: "10 minutes ago",
    unread: true,
  },
  {
    id: "n2",
    title: "New announcement",
    text: "A new company announcement is available to read.",
    date: "2 hours ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Payslip ready",
    text: "Your May 2025 payslip is ready to download.",
    date: "Yesterday",
    unread: false,
  },
];

const auditRows = [
  {
    id: "l1",
    date: "Jun 18, 2025 09:42",
    actor: "Ayesha Khan",
    action: "Updated employee",
    entity: "EMP-1048",
    before: { status: "probation" },
    after: { status: "active" },
  },
  {
    id: "l2",
    date: "Jun 18, 2025 09:15",
    actor: "Omar Farooq",
    action: "Approved leave",
    entity: "LV-2081",
    before: { status: "pending" },
    after: { status: "approved" },
  },
  {
    id: "l3",
    date: "Jun 17, 2025 16:30",
    actor: "System",
    action: "Finalized payroll",
    entity: "PAY-2025-05",
    before: { status: "draft" },
    after: { status: "finalized" },
  },
  {
    id: "l4",
    date: "Jun 17, 2025 14:08",
    actor: "Ayesha Khan",
    action: "Created department",
    entity: "Design",
    before: null,
    after: { name: "Design" },
  },
];

function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function AnnouncementsPage() {
  const [open, setOpen] = useState(false);
  const [posted, setPosted] = useState(announcements);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPosted([{ id: String(Date.now()), title, body, date: "Just now", by: "You" }, ...posted]);
    setTitle("");
    setBody("");
    setOpen(false);
  };
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Company updates</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your team informed with timely updates.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Megaphone data-icon="inline-start" /> Post announcement
        </Button>
      </header>
      <div className="grid gap-4">
        {posted.map((item) => (
          <Card key={item.id} className="transition-colors hover:border-emerald-500/40">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="mt-1">Posted by {item.by}</CardDescription>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{item.date}</time>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} title="Post announcement" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Announcement title"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Body
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-28 resize-none rounded-lg border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Write an update..."
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Send data-icon="inline-start" /> Publish
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState(notifications);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Personal alerts</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay on top of approvals and important updates.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setItems((current) => current.map((item) => ({ ...item, unread: false })))}
        >
          Mark all as read
        </Button>
      </header>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 p-5 hover:bg-muted/30">
              <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.unread && (
                    <span className="size-2 rounded-full bg-emerald-600" aria-label="Unread" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.date}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditPage() {
  const [selected, setSelected] = useState<(typeof auditRows)[number] | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-emerald-600">Security & compliance</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A complete history of important system activity.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            System activity
          </CardTitle>
          <CardDescription>Click a row to inspect the recorded changes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.date}
                    </TableCell>
                    <TableCell className="font-medium">{row.actor}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell className="font-mono text-xs">{row.entity}</TableCell>
                    <TableCell>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(selected)}
        title="Audit change details"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Before
              </p>
              <pre className="min-h-28 overflow-auto rounded-xl bg-muted p-3 text-xs">
                {JSON.stringify(selected.before ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                After
              </p>
              <pre className="min-h-28 overflow-auto rounded-xl bg-emerald-500/10 p-3 text-xs">
                {JSON.stringify(selected.after ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export function ProfilePage() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-emerald-600">Account settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Keep your contact details up to date.</p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
          <CardDescription>These details help HR reach you when needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(true);
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-2 text-sm font-medium">
              Phone
              <input
                defaultValue="+92 300 1234567"
                className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Address
              <textarea
                defaultValue="Karachi, Pakistan"
                className="min-h-24 resize-none rounded-lg border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>
            {saved && (
              <p className="text-sm font-medium text-emerald-600">Profile updated successfully.</p>
            )}
            <Button type="submit" className="w-fit bg-emerald-600 text-white hover:bg-emerald-700">
              <Save data-icon="inline-start" /> Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function CommsHubPage() {
  const [tab, setTab] = useState("announcements");
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-emerald-600">Workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Comms & audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Announcements, notifications, and administrative history in one place.
        </p>
      </header>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
        {[
          ["announcements", "Announcements"],
          ["notifications", "Notifications"],
          ["audit", "Audit log"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "announcements" ? (
        <AnnouncementsPage />
      ) : tab === "notifications" ? (
        <NotificationsPage />
      ) : (
        <AuditPage />
      )}
    </div>
  );
}

export default AnnouncementsPage;
