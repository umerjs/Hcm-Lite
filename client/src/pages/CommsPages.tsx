import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ShieldCheck, Bell, Megaphone } from "lucide-react";
import { http } from "../api/http";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import Input from "../components/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import EmptyState from "../components/shared/EmptyState";
import Loading from "../components/shared/Loading";
import type {
  Announcement,
  AnnouncementsResponse,
  AuditLogItem,
  GetAuditLogsResponse,
  Notification,
  NotificationsResponse,
  CreateAnnouncementRequest,
} from "../types/api";

const unwrap = <T,>(value: T | { data: T }): T =>
  (value && typeof value === "object" && "data" in value ? (value as any).data : value) as T;

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: async () =>
      unwrap<Announcement[]>((await http.get<AnnouncementsResponse | Announcement[]>("/announcements")).data),
  });

  const post = useMutation({
    mutationFn: (payload: CreateAnnouncementRequest) => http.post("/announcements", payload),
    onSuccess: () => {
      setTitle("");
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() && body.trim()) post.mutate({ title: title.trim(), body: body.trim() });
  };

  const announcementList = announcements.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header>
        <p className="text-xs sm:text-sm font-medium text-emerald-600">Company updates</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Broadcast company announcements to all staff or view organizational bulletins.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-emerald-600" />
            <CardTitle>Post announcement</CardTitle>
          </div>
          <CardDescription>Share news and notices with the entire company.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_2fr_auto]">
            <Input
              aria-label="Title"
              placeholder="Announcement headline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs sm:text-sm"
            />
            <Input
              aria-label="Message"
              placeholder="Detailed message or notice"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="text-xs sm:text-sm"
            />
            <Button type="submit" disabled={post.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Send className="mr-1.5 size-4" />
              {post.isPending ? "Posting..." : "Post"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent announcements</CardTitle>
          <CardDescription>Latest company broadcasts in reverse chronological order.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {announcements.isLoading ? (
            <div className="py-8">
              <Loading text="Loading announcements..." />
            </div>
          ) : announcementList.length === 0 ? (
            <EmptyState
              title="No announcements yet"
              message="Check back later for company updates or post one using the form above."
            />
          ) : (
            announcementList.map((item) => (
              <article key={item._id} className="rounded-xl border border-border p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-semibold text-xs sm:text-sm">{item.title}</h2>
                  <time className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {item.body}
                </p>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationsPage() {
  const notifications = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () =>
      unwrap<Notification[]>((await http.get<NotificationsResponse | Notification[]>("/notifications?unread=true")).data),
  });

  const notificationList = notifications.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header>
        <p className="text-xs sm:text-sm font-medium text-emerald-600">Personal alerts</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Unread alerts, workflow approvals, and updates.</p>
      </header>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {notifications.isLoading ? (
            <div className="py-12">
              <Loading text="Loading notifications..." />
            </div>
          ) : notificationList.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="All caught up!"
                message="You have no unread notifications or action items."
              />
            </div>
          ) : (
            notificationList.map((item) => (
              <div key={item._id} className="flex gap-3.5 p-4 hover:bg-muted/20 transition-colors">
                <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-600 shrink-0">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-foreground">{item.text}</p>
                  <time className="text-[11px] text-muted-foreground mt-1 block">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditPage() {
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: async () =>
      unwrap<AuditLogItem[]>((await http.get<GetAuditLogsResponse | AuditLogItem[]>("/audit")).data),
  });

  const auditList = audit.data ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <header>
        <p className="text-xs sm:text-sm font-medium text-emerald-600">Security & compliance</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Audit trail</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Immutable event log of administrative mutations and authentication activity.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            Recent administrative events
          </CardTitle>
          <CardDescription>Append-only audit ledger with actor attribution.</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <div className="py-12">
              <Loading text="Loading audit log..." />
            </div>
          ) : auditList.length === 0 ? (
            <EmptyState
              title="No audit events found"
              message="Administrative actions will be automatically recorded here."
            />
          ) : (
            <div className="overflow-x-auto w-full rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditList.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="text-xs sm:text-sm font-mono text-muted-foreground whitespace-nowrap">
                        {item.actor ?? item.actorId ?? "System"}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                        {item.action}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {item.entity}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
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
