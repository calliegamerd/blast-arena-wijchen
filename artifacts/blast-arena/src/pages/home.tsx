import { useEffect, useRef, useState } from "react";
import { useListSlots, useSubmitContact } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, useScroll, useTransform } from "framer-motion";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

import logo from "@assets/image-removebg-preview_(78)_1778351584029.png";
import heroBg from "@assets/ChatGPT_Image_9_mei_2026,_20_37_08_1778351835002.png";
import banner from "@assets/image_1778350399842.png";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SubscribeStep = "email" | "verify" | "done";

function SubscribeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<SubscribeStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setStep("email"); setEmail(""); setCode(""); setError(""); };

  const handleClose = () => { reset(); onClose(); };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setStep("done"); return; }
        setError(data.error ?? "Er ging iets mis");
        return;
      }
      setStep("verify");
    } catch {
      setError("Verbinding mislukt, probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscribe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Onjuiste code"); return; }
      setStep("done");
    } catch {
      setError("Verbinding mislukt, probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[420px] rounded-none clip-diagonal">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-widest text-lg">
            <span className="text-primary">BLAST</span><span className="text-secondary">ARENA</span>
            <span className="text-white text-sm ml-3 font-normal tracking-wider">Updates ontvangen</span>
          </DialogTitle>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={submitEmail} className="space-y-4 mt-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Schrijf je in en ontvang als eerste bericht wanneer BlastArena Wijchen opent en klaar is voor actie.
            </p>
            <Input
              type="email"
              placeholder="jouw@email.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background border-border focus-visible:ring-primary rounded-none clip-diagonal"
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
            <Button type="submit" disabled={loading || !email} className="w-full bg-primary text-black hover:bg-primary/80 clip-diagonal uppercase font-bold tracking-widest">
              {loading ? "Bezig..." : "Inschrijven"}
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={submitCode} className="space-y-4 mt-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              We hebben een 6-cijferige code gestuurd naar <span className="text-white font-mono">{email}</span>. Controleer ook je spam.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              className="bg-background border-border focus-visible:ring-primary rounded-none clip-diagonal font-mono text-xl tracking-[0.5em] text-center"
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
            <Button type="submit" disabled={loading || code.length < 6} className="w-full bg-primary text-black hover:bg-primary/80 clip-diagonal uppercase font-bold tracking-widest">
              {loading ? "Bezig..." : "Bevestigen"}
            </Button>
            <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="text-xs text-muted-foreground hover:text-white w-full text-center transition-colors">
              Ander e-mailadres gebruiken
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">🎯</div>
            <p className="text-white font-bold font-heading uppercase tracking-widest">Je staat op de lijst!</p>
            <p className="text-muted-foreground text-sm">We laten het je weten zodra BlastArena Wijchen opent.</p>
            <Button onClick={handleClose} className="bg-primary text-black hover:bg-primary/80 clip-diagonal uppercase font-bold tracking-widest mt-2">
              Sluiten
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const contactSchema = z.object({
  name: z.string().min(2, "Naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  phone: z.string().optional(),
  message: z.string().min(10, "Bericht moet minimaal 10 tekens bevatten"),
  type: z.enum(["warehouse", "general", "partnership"]),
  warehouseSize: z.string().optional(),
  warehouseLocation: z.string().optional(),
});

function GelParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    type Particle = {
      x: number; y: number; vx: number; vy: number;
      radius: number; color: string; alpha: number; pulse: number;
    };

    const particles: Particle[] = [];
    const colors = ["#5DDE26", "#1E90FF", "#3ab7f5", "#7aff3a"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 4 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let frame: number;
    let t = 0;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      t += 0.02;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.04;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const glowSize = p.radius * (1 + 0.3 * Math.sin(p.pulse));
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize * 3);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, "transparent");

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, glowSize * 3, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.globalAlpha = p.alpha * 0.3;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.alpha;
        ctx!.fill();
      });
      frame = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-50 mix-blend-screen pointer-events-none" />;
}

function ShootingLines() {
  return (
    <>
      <div className="shooting-line-h" style={{ top: "25%", animationDelay: "0s" }} />
      <div className="shooting-line-h" style={{ top: "60%", animationDelay: "1.4s" }} />
      <div className="shooting-line-v" style={{ left: "15%", animationDelay: "0.7s" }} />
      <div className="shooting-line-v" style={{ left: "80%", animationDelay: "2s" }} />
    </>
  );
}

export default function Home() {
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const { data: slots, isLoading: loadingSlots } = useListSlots();
  const submitContact = useSubmitContact();
  const { toast } = useToast();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.5], ["0%", "25%"]);

  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      type: "warehouse",
      warehouseSize: "",
      warehouseLocation: "",
    },
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    submitContact.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Bericht verzonden!",
            description: "We nemen zo snel mogelijk contact met je op.",
          });
          form.reset();
        },
        onError: () => {
          toast({
            title: "Er ging iets mis",
            description: "Probeer het later opnieuw.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isWarehouse = form.watch("type") === "warehouse";

  const statusLabel = (status: string) => {
    if (status === "open") return "Beschikbaar";
    if (status === "full") return "Vol";
    return "Geannuleerd";
  };

  return (
    <div className="relative w-full bg-background text-foreground selection:bg-primary selection:text-black">

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex items-center">
        <img src={logo} alt="BlastArena Wijchen" className="h-14 md:h-20 drop-shadow-[0_0_12px_rgba(93,222,38,0.5)]" />
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden scanlines">
        <motion.div style={{ y: heroY }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background z-10" />
          <img
            src={heroBg}
            alt="BlastArena missie"
            className="w-full h-full object-cover object-center"
          />
        </motion.div>

        <GelParticles />
        <ShootingLines />

        <div className="relative z-20 px-4 max-w-5xl mx-auto text-center flex flex-col items-center" style={{ marginTop: "6rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <div className="mb-2 text-secondary font-heading tracking-[0.3em] uppercase text-sm font-bold">
              Binnenkort open in Wijchen
            </div>
            <h1 className="text-7xl md:text-9xl font-black leading-none mb-6">
              <span className="text-primary glitch-text" data-text="BLAST">BLAST</span>
              <br />
              <span className="text-secondary glitch-text-blue" data-text="ARENA">ARENA</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/70 font-heading tracking-widest uppercase mb-10 max-w-lg">
              De ultieme indoor gel blaster arena.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="bg-primary text-black hover:bg-primary/80 clip-diagonal h-14 px-10 text-base font-bold uppercase tracking-widest shadow-[0_0_24px_rgba(93,222,38,0.4)] transition-all"
              onClick={() => setSubscribeOpen(true)}
            >
              Inschrijven
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary/10 clip-diagonal h-14 px-10 text-base font-bold uppercase tracking-widest backdrop-blur-sm"
              onClick={() => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" })}
            >
              Word locatiepartner
            </Button>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse" />
        </div>
      </section>

      {/* Over ons */}
      <section className="py-28 px-4 bg-card relative z-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ paddingLeft: "5%" }}
          >
            <div className="text-secondary font-heading tracking-[0.2em] uppercase text-xs mb-4 font-bold">Wat is BlastArena</div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white uppercase leading-tight">
              Meer dan<br />een spel
            </h2>
            <p className="text-muted-foreground text-base mb-6 leading-relaxed max-w-md">
              BlastArena Wijchen is geen gewoon speelcentrum. Het is een indoor gel blaster arena vol actie, ontworpen voor gezinnen, vriendengroepen en bedrijfsuitjes. Via onze app boek je een maandelijks abonnement en speel je onbeperkt mee in open slots.
            </p>
            <div className="w-20 h-[2px] bg-primary mt-8" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="bg-background border border-border clip-diagonal p-10 flex flex-col justify-center text-center relative overflow-hidden" style={{ marginRight: "-5%" }}>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
              <h3 className="text-2xl font-heading text-primary mb-3 uppercase font-bold tracking-wider">App-abonnement</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Boek sessies eenvoudig via de app, verzamel je team en bereid je voor op actie. Onbeperkt spelen voor een vast maandbedrag.</p>
              <div className="mt-6 text-secondary font-heading uppercase tracking-widest text-xs font-bold">Binnenkort beschikbaar</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Slots */}
      <section className="py-24 px-4 bg-background relative z-10 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
            style={{ paddingLeft: "3%" }}
          >
            <div className="text-secondary font-heading tracking-[0.2em] uppercase text-xs mb-3 font-bold">Reserveer je plek</div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase">Komende sessies</h2>
          </motion.div>

          {loadingSlots ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-card animate-pulse clip-diagonal border border-border" />
              ))}
            </div>
          ) : slots?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {slots.map((slot) => (
                <Card key={slot.id} className="bg-card border-border clip-diagonal overflow-hidden hover:border-primary transition-colors">
                  <CardHeader className="pb-2 bg-background/40 border-b border-border/50">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-heading uppercase text-lg text-primary">{slot.title}</CardTitle>
                      <Badge
                        variant={slot.status === "open" ? "default" : "secondary"}
                        className="uppercase font-bold tracking-wider text-[10px]"
                      >
                        {statusLabel(slot.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground font-mono text-sm mb-4">
                      {format(new Date(slot.startTime), "d MMM, HH:mm", { locale: nl })} -{" "}
                      {format(new Date(slot.endTime), "HH:mm")}
                    </p>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-white uppercase tracking-wider">Capaciteit</span>
                      <span className="text-secondary">{slot.bookedCount} / {slot.capacity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-border clip-diagonal bg-card">
              <p className="text-muted-foreground font-heading text-xl uppercase tracking-widest">Nog geen sessies gepland.</p>
              <p className="text-muted-foreground/60 text-sm mt-2">Kom binnenkort terug.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact / Locatie */}
      <section id="contact-form" className="py-28 px-4 bg-card relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
            style={{ paddingLeft: "3%" }}
          >
            <div className="text-secondary font-heading tracking-[0.2em] uppercase text-xs mb-4 font-bold">Locatiepartner gezocht</div>
            <h2 className="text-4xl md:text-5xl font-black text-primary uppercase mb-6">Op zoek naar een locatie</h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
              Ben jij eigenaar van een loods of heb je 300-500m2 beschikbaar in de regio Wijchen? Wij zoeken een partner die samen met ons een indoor gel blaster arena wil starten. Ideaal voor ondernemers die hun ruimte willen benutten. Neem contact op, samen bouwen we iets episch.
            </p>
          </motion.div>

          <div className="bg-background border border-border p-6 md:p-10 clip-diagonal shadow-[0_0_40px_rgba(30,144,255,0.08)]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="uppercase tracking-widest text-secondary font-bold text-xs">Type contact</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col md:flex-row gap-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0 bg-card p-4 border border-border clip-diagonal cursor-pointer hover:border-primary transition-colors flex-1">
                            <FormControl>
                              <RadioGroupItem value="warehouse" />
                            </FormControl>
                            <FormLabel className="font-bold cursor-pointer uppercase tracking-wider text-sm">Locatie Partner</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 bg-card p-4 border border-border clip-diagonal cursor-pointer hover:border-primary transition-colors flex-1">
                            <FormControl>
                              <RadioGroupItem value="general" />
                            </FormControl>
                            <FormLabel className="font-bold cursor-pointer uppercase tracking-wider text-sm">Algemeen / Interesse</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase tracking-widest text-xs">Naam</FormLabel>
                        <FormControl>
                          <Input placeholder="Jan de Vries" className="bg-card border-border focus-visible:ring-primary clip-diagonal rounded-none h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase tracking-widest text-xs">E-mailadres</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jan@example.nl" className="bg-card border-border focus-visible:ring-primary clip-diagonal rounded-none h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-widest text-xs">Telefoonnummer (optioneel)</FormLabel>
                      <FormControl>
                        <Input placeholder="06 12345678" className="bg-card border-border focus-visible:ring-primary clip-diagonal rounded-none h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isWarehouse && (
                  <div className="grid md:grid-cols-2 gap-6 bg-secondary/5 p-6 border border-secondary/20 clip-diagonal">
                    <FormField
                      control={form.control}
                      name="warehouseSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase tracking-widest text-xs text-secondary">Oppervlakte (m2)</FormLabel>
                          <FormControl>
                            <Input placeholder="bijv. 400m2" className="bg-background border-secondary/30 focus-visible:ring-secondary clip-diagonal rounded-none h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="warehouseLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase tracking-widest text-xs text-secondary">Locatie</FormLabel>
                          <FormControl>
                            <Input placeholder="bijv. Wijchen Noord" className="bg-background border-secondary/30 focus-visible:ring-secondary clip-diagonal rounded-none h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-widest text-xs">Bericht</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Vertel ons meer over jezelf of je locatie..."
                          className="bg-card border-border focus-visible:ring-primary clip-diagonal rounded-none min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={submitContact.isPending}
                  className="w-full bg-primary text-black hover:bg-primary/80 clip-diagonal h-14 text-base font-bold uppercase tracking-widest"
                >
                  {submitContact.isPending ? "Verzenden..." : "Word locatiepartner"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-background border-t border-border relative z-10 flex items-center justify-between">
        <img src={logo} alt="BlastArena Wijchen" className="h-10 opacity-70" />
        <p className="text-muted-foreground font-heading tracking-widest uppercase text-xs">
          &copy; {new Date().getFullYear()} BlastArena Wijchen. Alle rechten voorbehouden.
        </p>
      </footer>

      <SubscribeModal open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </div>
  );
}
