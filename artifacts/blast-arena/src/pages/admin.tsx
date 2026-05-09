import { useState, useRef } from "react";
import { Link } from "wouter";
import { 
  useGetAdminStats, 
  useListContacts, 
  useDeleteContact,
  useListAdminSlots,
  useCreateSlot,
  useUpdateSlot,
  useDeleteSlot 
} from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import logo from "@assets/image_1778350291643.png";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, LogOut, Plus, Edit, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const slotSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  status: z.enum(["open", "full", "cancelled"]),
  notes: z.string().optional(),
});

export default function Admin() {
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const { data: contacts, isLoading: loadingContacts } = useListContacts();
  const { data: slots, isLoading: loadingSlots } = useListAdminSlots();
  
  const deleteContact = useDeleteContact();
  const deleteSlot = useDeleteSlot();
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();

  const [activeTab, setActiveTab] = useState<"contacts" | "slots">("contacts");
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);

  const slotForm = useForm<z.infer<typeof slotSchema>>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      title: "",
      startTime: "",
      endTime: "",
      capacity: 20,
      status: "open",
      notes: "",
    },
  });

  const handleDeleteContact = (id: number) => {
    if (confirm("Delete this contact forever?")) {
      deleteContact.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Contact deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        }
      });
    }
  };

  const handleDeleteSlot = (id: number) => {
    if (confirm("Delete this slot?")) {
      deleteSlot.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Slot deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        }
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
    const formattedData = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    };

    if (editingSlotId) {
      updateSlot.mutate({ id: editingSlotId, data: formattedData }, {
        onSuccess: () => {
          toast({ title: "Slot updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
          setSlotDialogOpen(false);
        }
      });
    } else {
      createSlot.mutate({ data: formattedData }, {
        onSuccess: () => {
          toast({ title: "Slot created" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
          setSlotDialogOpen(false);
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border p-6 flex flex-col">
        <div className="mb-10">
          <Link href="/">
            <img src={logo} alt="BlastArena" className="h-10 mb-2 cursor-pointer" />
          </Link>
          <div className="flex items-center gap-2 text-primary font-heading tracking-widest text-sm uppercase font-bold">
            <ShieldAlert className="w-4 h-4" /> COMMAND CENTER
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            className={`w-full text-left px-4 py-3 font-heading uppercase font-bold tracking-wider clip-diagonal transition-colors ${activeTab === 'contacts' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
          </button>
          <button 
            className={`w-full text-left px-4 py-3 font-heading uppercase font-bold tracking-wider clip-diagonal transition-colors ${activeTab === 'slots' ? 'bg-secondary text-white' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
            onClick={() => setActiveTab('slots')}
          >
            Deployments (Slots)
          </button>
        </nav>

        <Button 
          variant="outline" 
          className="mt-auto border-destructive text-destructive hover:bg-destructive/10 clip-diagonal uppercase font-bold tracking-wider"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <h1 className="text-3xl font-black font-heading uppercase text-white mb-8 tracking-widest">
          {activeTab === 'contacts' ? 'Intel / Contacts' : 'Deployment Schedule'}
        </h1>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Total Intel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{loadingStats ? '-' : stats?.totalContacts}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">HQ Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-primary">{loadingStats ? '-' : stats?.warehouseContacts}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{loadingStats ? '-' : stats?.totalSlots}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border clip-diagonal">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Active Ops</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-secondary">{loadingStats ? '-' : stats?.openSlots}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        {activeTab === 'contacts' && (
          <div className="bg-card border border-border p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Date</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Type</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Name</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Contact</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Details</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingContacts ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading intel...</TableCell></TableRow>
                  ) : contacts?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No intel received yet.</TableCell></TableRow>
                  ) : (
                    contacts?.map((c) => (
                      <TableRow key={c.id} className="border-border/50 hover:bg-white/5">
                        <TableCell className="font-mono text-xs">{format(new Date(c.createdAt), "yyyy-MM-dd HH:mm")}</TableCell>
                        <TableCell>
                          <Badge variant={c.type === 'warehouse' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-white">{c.name}</TableCell>
                        <TableCell className="text-sm">
                          <div>{c.email}</div>
                          {c.phone && <div className="text-muted-foreground text-xs">{c.phone}</div>}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {c.type === 'warehouse' && (
                            <div className="mb-2 text-xs text-primary font-mono">
                              [Size: {c.warehouseSize || '?'}] [Loc: {c.warehouseLocation || '?'}]
                            </div>
                          )}
                          <p className="text-sm truncate text-muted-foreground" title={c.message}>{c.message}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20 border-0" onClick={() => handleDeleteContact(c.id)}>
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

        {activeTab === 'slots' && (
          <div className="bg-card border border-border p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading uppercase text-xl font-bold">Manage Slots</h2>
              <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateSlot} className="bg-secondary text-white hover:bg-secondary/80 clip-diagonal uppercase font-bold tracking-wider">
                    <Plus className="w-4 h-4 mr-2" /> New Deployment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-[500px] clip-diagonal rounded-none">
                  <DialogHeader>
                    <DialogTitle className="font-heading uppercase tracking-widest text-primary text-xl">
                      {editingSlotId ? "Edit Deployment" : "Plan New Deployment"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...slotForm}>
                    <form onSubmit={slotForm.handleSubmit(onSlotSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={slotForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase tracking-widest text-xs">Title / Mission Name</FormLabel>
                            <FormControl>
                              <Input className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={slotForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="uppercase tracking-widest text-xs">Start Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={slotForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="uppercase tracking-widest text-xs">End Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={slotForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="uppercase tracking-widest text-xs">Max Capacity</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={slotForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="uppercase tracking-widest text-xs">Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background border-border clip-diagonal rounded-none text-white">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background border-border">
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="full">Full</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={slotForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase tracking-widest text-xs">Intel Notes</FormLabel>
                            <FormControl>
                              <Textarea className="bg-background border-border focus-visible:ring-primary clip-diagonal rounded-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={createSlot.isPending || updateSlot.isPending} className="bg-primary text-black hover:bg-primary/80 clip-diagonal uppercase font-bold tracking-wider">
                          {editingSlotId ? "Update Deployment" : "Launch Deployment"}
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
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Mission</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Schedule</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Capacity</TableHead>
                    <TableHead className="font-heading uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSlots ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading schedule...</TableCell></TableRow>
                  ) : slots?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deployments scheduled.</TableCell></TableRow>
                  ) : (
                    slots?.map((s) => (
                      <TableRow key={s.id} className="border-border/50 hover:bg-white/5">
                        <TableCell className="font-bold text-primary">{s.title}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(s.startTime), "MMM do, HH:mm")} - {format(new Date(s.endTime), "HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <span className={s.bookedCount >= s.capacity ? "text-destructive" : "text-white"}>{s.bookedCount}</span> / {s.capacity}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'open' ? 'default' : s.status === 'full' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" className="text-secondary hover:bg-secondary/20 border-0" onClick={() => openEditSlot(s)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20 border-0" onClick={() => handleDeleteSlot(s.id)}>
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
      </main>
    </div>
  );
}