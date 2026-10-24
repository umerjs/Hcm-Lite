import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ShieldCheck } from "lucide-react";
import { http } from "../api/http";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import Input from "../components/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import type { Announcement, AnnouncementsResponse, AuditLogItem, GetAuditLogsResponse, Notification, NotificationsResponse, CreateAnnouncementRequest } from "../types/api";

const unwrap = <T,>(value: T | { data: T }): T => (value && typeof value === "object" && "data" in value ? value.data : value) as T;

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const announcements = useQuery({ queryKey: ["announcements"], queryFn: async () => unwrap<Announcement[]>((await http.get<AnnouncementsResponse | Announcement[]>("/announcements")).data) });
  const post = useMutation({ mutationFn: (payload: CreateAnnouncementRequest) => http.post("/announcements", payload), onSuccess: () => { setTitle(""); setBody(""); void queryClient.invalidateQueries({ queryKey: ["announcements"] }); } });
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim() && body.trim()) post.mutate({ title, body }); };
  return <div className="flex flex-col gap-6"><header><p className="text-sm font-medium text-emerald-600">Company updates</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Announcements</h1></header><Card><CardHeader><CardTitle>Post announcement</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"><Input aria-label="Title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} /><Input aria-label="Message" placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} /><Button type="submit"><Send data-icon="inline-start" />Post</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Recent announcements</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">{(announcements.data ?? []).map((item) => <article key={item._id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-4"><h2 className="font-semibold">{item.title}</h2><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</time></div><p className="mt-2 text-sm text-muted-foreground">{item.body}</p></article>)}</CardContent></Card></div>;
}

export function NotificationsPage() {
  const notifications = useQuery({ queryKey: ["notifications", "unread"], queryFn: async () => unwrap<Notification[]>((await http.get<NotificationsResponse | Notification[]>("/notifications?unread=true")).data) });
  return <div className="flex flex-col gap-6"><header><h1 className="text-2xl font-bold tracking-tight">Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Unread alerts and updates.</p></header><Card><CardContent className="divide-y p-0">{(notifications.data ?? []).map((item) => <div key={item._id} className="flex gap-3 p-4"><div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-600"><Send className="size-4" /></div><div><p className="text-sm">{item.text}</p><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div></div>)}</CardContent></Card></div>;
}

export function AuditPage() {
  const audit = useQuery({ queryKey: ["audit"], queryFn: async () => unwrap<AuditLogItem[]>((await http.get<GetAuditLogsResponse | AuditLogItem[]>("/audit")).data) });
  return <div className="flex flex-col gap-6"><header><h1 className="text-2xl font-bold tracking-tight">Audit trail</h1><p className="mt-1 text-sm text-muted-foreground">System activity and security history.</p></header><Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-600" />Recent activity</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{(audit.data ?? []).map((item) => <TableRow key={item._id}><TableCell>{item.actor ?? item.actorId ?? "System"}</TableCell><TableCell className="font-medium">{item.action}</TableCell><TableCell>{item.entity}</TableCell><TableCell className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></div>;
}
