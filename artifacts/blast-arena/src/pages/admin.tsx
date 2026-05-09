import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useGetAdminStats,
  useListContacts,
  useDeleteContact,
  useListAdminSlots,
  useCreateSlot,
  useUpdateSlot,
  useDeleteSlot,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import logo from "@assets/image-removebg-preview_(78)_1778351584029.png";

function getCsrfToken(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { "x-csrf-token": token } : {};
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, LogOut, Plus, Edit, ShieldAlert, Send, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const slotSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  startTime: z.string().min(1, "Starttijd is verplicht"),
  endTime: z.string().min(1, "Eindtijd is verplicht"),
  capacity: z.coerce.number().min(1, "Minimaal 1 plek"),
  status: z.enum(["open", "full", "cancelled"]),
  notes: z.string().optional(),
});

const broadcastSchema = z.object({
  subject: z.string().min(3, "Onderwerp is verplicht"),
  text: z.string().min(10, "Berichttekst is verplicht"),
});

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        onAuth();
      } else {
        setError("Ongeldig wachtwoord.");
        setPassword("");
      }
    } catch {
      setError("Verbinding mislukt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background scanlines">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-card border border-border/60 text-foreground px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors clip-diagonal"
          autoFocus
          autoComplete="current-password"
        />
        {error && (
          <p className="text-destructive text-xs font-mono tracking-wider">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-primary text-black font-bold uppercase tracking-widest py-3 clip-diagonal hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Toegang"}
        </button>
      </form>
    </div>
  );
}

type Subscriber = {
  id: number;
  email: string;
  verified: boolean;
  createdAt: string;
};

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const { data: contacts, isLoading: loadingContacts } = useListContacts();
  const { data: slots, isLoading: loadingSlots } = useListAdminSlots();

  const deleteContact = useDeleteContact();
  const deleteSlot = useDeleteSlot();
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();

  const [activeTab, setActiveTab] = useState<"contacts" | "slots" | "subscribers" | "broadcast">("contacts");
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);

  const slotForm = useForm<z.infer<typeof slotSchema>>({
    resolver: zodResolver(slotSchema),
    defaultValues: { title: "", startTime: "", endTime: "", capacity: 20, status: "open", notes: "" },
  });

  const broadcastForm = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { subject: "", text: "" },
  });

  useEffect(() => {
    if (activeTab === "subscribers" || activeTab === "broadcast") {
      setLoadingSubscribers(true);
      fetch("/api/admin/subscribers", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setSubscribers(data))
        .catch(() => setSubscribers([]))
        .finally(() => setLoadingSubscribers(false));
    }
  }, [activeTab]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
      headers: { ...csrfHeaders() },
    });
    onLogout();
  };

  const handleDeleteContact = (id: number) => {
    if (confirm("Contact permanent verwijderen?")) {
      deleteContact.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Contact verwijderd" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
      });
    }
  };

  const handleDeleteSubscriber = async (id: number) => {
    if (!confirm("Inschrijving verwijderen?")) return;
    await fetch(`/api/admin/subscribers/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { ...csrfHeaders() },
    });
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Inschrijving verwijderd" });
  };

  const handleDeleteSlot = (id: number) => {
    if (confirm("Sessie verwijderen?")) {
      deleteSlot.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Sessie verwijderd" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
      });
    }
  };

  const openCreateSlot = () => {
    setEditingSlotId(null);
    slotForm.reset({
      title: "",
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      capacity: 20,
      status: "open",
      notes: "",
    });
    setSlotDialogOpen(true);
  };

  const openEditSlot = (slot: any) => {
    setEditingSlotId(slot.id);
    slotForm.reset({
      title: slot.title,
      startTime: new Date(slot.startTime).toISOString().slice(0, 16),
      endTime: new Date(slot.endTime).toISOString().slice(0, 16),
      capacity: slot.capacity,
      status: slot.status,
      notes: slot.notes || "",
    });
    setSlotDialogOpen(true);
  };

  const onSlotSubmit = (data: z.infer<typeof slotSchema>) => {
    const formatted = { ...data, startTime: new Date(data.startTime).toISOString(), endTime: new Date(data.endTime).toISOString() };
    if (editingSlotId) {
      updateSlot.mutate({ id: editingSlotId, data: formatted }, {
        onSuccess: () => {
          toast({ title: "Sessie bijgewerkt" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
          setSlotDialogOpen(false);
        },
      });
    } else {
      createSlot.mutate({ data: formatted }, {
        onSuccess: () => {
          toast({ title: "Sessie aangemaakt" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
          setSlotDialogOpen(false);
        },
      });
    }
  };

  const onBroadcastSubmit = async (data: z.infer<typeof broadcastSchema>) => {
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          subject: data.subject,
          text: data.text,
          html: `<div style="font-family:sans-serif;background:#0A0A0F;color:#fff;padding:40px;max-width:540px;margin:0 auto">
            <h1 style="color:#5DDE26;letter-spacing:4px;font-size:24px;margin:0 0 4px">BLAST<span style="color:#1E90FF">ARENA</span></h1>
            <p style="color:#888;font-size:11px;margin:0 0 28px;letter-spacing:2px">WIJCHEN, NEDERLAND</p>
            <h2 style="color:#fff;margin:0 0 16px">${data.subject}</h2>
            <div style="color:#ccc;line-height:1.7;white-space:pre-wrap">${data.text}</div>
            <p style="color:#555;font-size:11px;margin-top:32px">Je ontvangt dit bericht omdat je je hebt ingeschreven bij BlastArena Wijchen.</p>
          </div>`,
        }),
      });
      const result = await res.json();
      toast({ title: `Mail verstuurd naar ${result.sent} abonnees!` });
      broadcastForm.reset();
    } catch {
      toast({ title: "Verzenden mislukt", variant: "destructive" });
    } finally {
      setBroadcastSending(false);
    }
  };

  const typeLabel = (type: string) => {
    if (type === "warehouse") return "Locatie";
    if (type === "partnership") return "Partner";
    return "Algemeen";
  };

  const statusLabel = (status: string) => {
    if (status === "open") return "Open";
    if (status === "full") return "Vol";
    return "Geannuleerd";
  };

  const verifiedCount = subscribers.filter((s) => s.verified).length;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-60 bg-card border-r border-border p-6 flex flex-col shrink-0">
        <div className="mb-8">
          <Link href="/">
            <img src={logo} alt="BlastArena" className="h-10 cursor-pointer mb-3 drop-shadow-[0_0_8px_rgba(93,222,38,0.4)]" />
          </Link>
          <div className="flex items-center gap-2 text-primary font-heading tracking-widest text-xs uppercase font-bold">
            <ShieldAlert className="w-3 h-3" /> Beheercentrum
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {(["contacts", "slots", "subscribers", "broadcast"] as const).map((tab) => {
            const labels: Record<string, string> = { contacts: "Contacten", slots: "Sessies", subscribers: "Inschrijvingen", broadcast: "Mail sturen" };
            const active = activeTab === tab;
            const colorClass = tab === "slots" ? "bg-secondary text-white" : tab === "subscribers" ? "bg-primary/80 text-black" : tab === "broadcast" ? "bg-primary text-black" : "bg-primary text-black";
            return (
              <button
                key={tab}
                className={`w-full text-left px-4 py-3 font-heading uppercase font-bold tracking-wider text-sm clip-diagonal transition-colors ${active ? colorClass : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                onClick={() => setActiveTab(tab)}
              >
                {labels[tab]}
              </button>
            );
          })}
        </nav>

        <Button
          variant="outline"
          className="mt-auto border-destructive text-destructive hover:bg-destructive/10 clip-diagonal uppercase font-bold tracking-wider text-xs"
          onClick={handleLogout}
        >
          <LogOut className="w-3 h-3 mr-2" /> Uitloggen
        </Button>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <h1 className="text-2xl font-black font-heading uppercase text-white mb-6 tracking-widest">
          {{ contacts: "Contacten", slots: "Sessies beheren", subscribers: "Inschrijvingen", broadcast: "Mail sturen" }[activeTab]}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Contacten</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-black text-white">{loadingStats ? "-" : stats?.totalContacts}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Locaties</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-black text-primary">{loadingStats ? "-" : stats?.warehouseContacts}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Abonnees</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-black text-secondary">{loadingStats ? "-" : verifiedCount || "0"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Open slots</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-black text-white">{loadingStats ? "-" : stats?.openSlots}</div>
            </CardContent>
          </Card>
        </div>

        {activeTab === "contacts" && (
          <div className="bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Datum</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Type</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Naam</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Contact</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Bericht</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingContacts ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Laden...</TableCell></TableRow>
                  ) : contacts?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nog geen contacten ontvangen.</TableCell></TableRow>
                  ) : (
                    contacts?.map((c) => (
                      <TableRow key={c.id} className="border-border/50 hover:bg-white/5">
                        <TableCell className="font-mono text-xs">{format(new Date(c.createdAt), "dd-MM-yy HH:mm")}</TableCell>
                        <TableCell>
                          <Badge variant={c.type === "warehouse" ? "default" : "secondary"} className="uppercase text-[10px]">
                            {typeLabel(c.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-white text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm">
                          <div className="text-foreground/80">{c.email}</div>
                          {c.phone && <div className="text-muted-foreground text-xs">{c.phone}</div>}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {c.type === "warehouse" && c.warehouseSize && (
                            <div className="mb-1 text-xs text-primary font-mono">[{c.warehouseSize}] {c.warehouseLocation && `[${c.warehouseLocation}]`}</div>
                          )}
                          <p className="text-xs truncate text-muted-foreground" title={c.message}>{c.message}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20" onClick={() => handleDeleteContact(c.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "subscribers" && (
          <div className="bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-heading uppercase text-sm font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" /> {verifiedCount} geverifieerd / {subscribers.length} totaal
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">E-mail</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Status</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Datum</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSubscribers ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Laden...</TableCell></TableRow>
                  ) : subscribers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nog geen inschrijvingen.</TableCell></TableRow>
                  ) : (
                    subscribers.map((s) => (
                      <TableRow key={s.id} className="border-border/50 hover:bg-white/5">
                        <TableCell className="font-mono text-sm text-white">{s.email}</TableCell>
                        <TableCell>
                          <Badge variant={s.verified ? "default" : "secondary"} className="uppercase text-[10px]">
                            {s.verified ? "Geverifieerd" : "Ausstehend"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd-MM-yy HH:mm")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20" onClick={() => handleDeleteSubscriber(s.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "slots" && (
          <div className="bg-card border border-border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <span className="font-heading uppercase text-sm font-bold text-muted-foreground tracking-wider">Alle sessies</span>
              <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateSlot} className="bg-secondary text-white hover:bg-secondary/80 clip-diagonal uppercase font-bold tracking-wider text-xs h-9">
                    <Plus className="w-3 h-3 mr-2" /> Nieuwe sessie
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-[480px] clip-diagonal rounded-none">
                  <DialogHeader>
                    <DialogTitle className="font-heading uppercase tracking-widest text-primary text-lg">
                      {editingSlotId ? "Sessie bewerken" : "Nieuwe sessie aanmaken"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...slotForm}>
                    <form onSubmit={slotForm.handleSubmit(onSlotSubmit)} className="space-y-4 mt-3">
                      <FormField control={slotForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase tracking-widest text-xs">Naam sessie</FormLabel>
                          <FormControl><Input className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={slotForm.control} name="startTime" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase tracking-widest text-xs">Starttijd</FormLabel>
                            <FormControl><Input type="datetime-local" className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={slotForm.control} name="endTime" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase tracking-widest text-xs">Eindtijd</FormLabel>
                            <FormControl><Input type="datetime-local" className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={slotForm.control} name="capacity" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase tracking-widest text-xs">Max. deelnemers</FormLabel>
                            <FormControl><Input type="number" min={1} className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={slotForm.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase tracking-widest text-xs">Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background border-border clip-diagonal rounded-none text-white"><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background border-border">
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="full">Vol</SelectItem>
                                <SelectItem value="cancelled">Geannuleerd</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={slotForm.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase tracking-widest text-xs">Notities</FormLabel>
                          <FormControl><Textarea className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="pt-2 flex justify-end">
                        <Button type="submit" disabled={createSlot.isPending || updateSlot.isPending} className="bg-primary text-black hover:bg-primary/80 clip-diagonal uppercase font-bold tracking-wider text-xs">
                          {editingSlotId ? "Opslaan" : "Aanmaken"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Sessie</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Tijdstip</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Plekken</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground text-xs">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSlots ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Laden...</TableCell></TableRow>
                  ) : slots?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nog geen sessies ingepland.</TableCell></TableRow>
                  ) : (
                    slots?.map((s) => (
                      <TableRow key={s.id} className="border-border/50 hover:bg-white/5">
                        <TableCell className="font-bold text-primary text-sm">{s.title}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(s.startTime), "d MMM, HH:mm", { locale: nl })} - {format(new Date(s.endTime), "HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <span className={s.bookedCount >= s.capacity ? "text-destructive" : "text-white"}>{s.bookedCount}</span>
                          <span className="text-muted-foreground"> / {s.capacity}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "open" ? "default" : s.status === "full" ? "destructive" : "secondary"} className="uppercase text-[10px]">
                            {statusLabel(s.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="text-secondary hover:bg-secondary/20" onClick={() => openEditSlot(s)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20" onClick={() => handleDeleteSlot(s.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "broadcast" && (
          <div className="max-w-2xl">
            <div className="bg-card border border-border p-6 mb-4">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs font-heading uppercase tracking-widest">
                <Users className="w-3 h-3" /> Ontvangers
              </div>
              <p className="text-white font-bold text-lg">
                {loadingSubscribers ? "Laden..." : `${verifiedCount} geverifieerde abonnee${verifiedCount !== 1 ? "s" : ""}`}
              </p>
              {verifiedCount === 0 && !loadingSubscribers && (
                <p className="text-muted-foreground text-xs mt-1">Nog geen geverifieerde abonnees. Inschrijvingen via de website worden hier weergegeven.</p>
              )}
            </div>

            <Form {...broadcastForm}>
              <form onSubmit={broadcastForm.handleSubmit(onBroadcastSubmit)} className="space-y-4">
                <FormField control={broadcastForm.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-widest text-xs">Onderwerp</FormLabel>
                    <FormControl>
                      <Input placeholder="bijv. BlastArena opent binnenkort!" className="bg-card border-border focus-visible:ring-primary rounded-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={broadcastForm.control} name="text" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-widest text-xs">Berichttekst</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Schrijf hier je bericht..."
                        className="bg-card border-border focus-visible:ring-primary rounded-none min-h-[180px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button
                  type="submit"
                  disabled={broadcastSending || verifiedCount === 0}
                  className="bg-primary text-black hover:bg-primary/80 clip-diagonal uppercase font-bold tracking-wider"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {broadcastSending ? "Versturen..." : `Stuur naar ${verifiedCount} abonnee${verifiedCount !== 1 ? "s" : ""}`}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => setIsAuthenticated(r.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuth={() => setIsAuthenticated(true)} />;
  }

  return <AdminPanel onLogout={() => setIsAuthenticated(false)} />;
}
