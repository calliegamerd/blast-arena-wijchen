import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { useListSlots, useSubmitContact } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, useScroll, useTransform } from "framer-motion";
import { format } from "date-fns";

import logo from "@assets/image_1778350291643.png";
import banner from "@assets/image_1778350399842.png";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const contactSchema = z.object({
  name: z.string().min(2, "Naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  phone: z.string().optional(),
  message: z.string().min(10, "Bericht moet minimaal 10 tekens bevatten"),
  type: z.enum(["warehouse", "general", "partnership"]),
  warehouseSize: z.string().optional(),
  warehouseLocation: z.string().optional(),
});

function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; radius: number; color: string; alpha: number };
    const particles: Particle[] = [];
    const colors = ["#5DDE26", "#1E90FF", "#0A0A0F"];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random(),
      });
    }

    let animationFrame: number;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.alpha;
        ctx!.fill();
      });
      animationFrame = requestAnimationFrame(draw);
    }
    draw();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none" />;
}

export default function Home() {
  const { data: slots, isLoading: loadingSlots } = useListSlots();
  const submitContact = useSubmitContact();
  const { toast } = useToast();
  const { scrollYProgress } = useScroll();
  const yY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

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

  return (
    <div className="relative w-full bg-background text-foreground selection:bg-primary selection:text-black">
      {/* Navbar Placeholder */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center">
        <img src={logo} alt="BlastArena Logo" className="h-12 md:h-16" />
        <Link href="/sign-in" className="font-heading text-lg font-bold tracking-widest text-primary hover:text-secondary transition-colors uppercase">
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden scanlines pt-20">
        <motion.div style={{ y: yY }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/80 z-10" />
          <img src={banner} alt="Arena Background" className="w-full h-full object-cover object-center opacity-30 grayscale" />
        </motion.div>
        
        <ParticleHero />
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-6xl md:text-8xl font-black mb-4 glitch-text" data-text="BLAST ARENA">
              BLAST <span className="text-primary">ARENA</span>
            </h1>
            <p className="text-xl md:text-2xl text-secondary font-heading tracking-widest uppercase mb-8 font-bold">
              The ultimate indoor gel blaster experience.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 mt-8"
          >
            <Button size="lg" className="bg-primary text-black hover:bg-primary/80 clip-diagonal h-14 px-8 text-lg font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(93,222,38,0.4)] transition-all">
              Join the Waitlist
            </Button>
            <Button size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary/10 clip-diagonal h-14 px-8 text-lg font-bold uppercase tracking-wider backdrop-blur-sm"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Partner with us
            </Button>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-[2px] h-16 bg-gradient-to-b from-transparent via-primary to-transparent" />
        </div>
      </section>

      {/* Teaser Section */}
      <section className="py-24 px-4 bg-card relative z-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white uppercase">More than just a game</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              BlastArena Wijchen is not your generic activity center. It's a high-energy urban combat zone designed for competitive families and friend groups. Powered by our custom app, you book slots, track stats, and subscribe to keep the adrenaline flowing.
            </p>
            <div className="w-24 h-1 bg-secondary mt-8" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square bg-background border border-border clip-diagonal p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="shooting-line top-0 left-0 w-full" />
              <div className="shooting-line bottom-0 left-0 w-full" style={{ animationDelay: '1s' }} />
              <h3 className="text-3xl font-heading text-primary mb-4 uppercase font-bold">App-based Subscriptions</h3>
              <p className="text-muted-foreground">Book sessions seamlessly, gather your faction, and prepare for battle.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Slots (Preview) */}
      <section className="py-24 px-4 bg-background relative z-10 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase mb-2">Deployments</h2>
              <p className="text-secondary font-heading tracking-widest uppercase">Upcoming Open Slots</p>
            </div>
          </motion.div>

          {loadingSlots ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 bg-card animate-pulse clip-diagonal border border-border" />
              ))}
            </div>
          ) : slots?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {slots.map(slot => (
                <Card key={slot.id} className="bg-card border-border clip-diagonal overflow-hidden group hover:border-primary transition-colors">
                  <CardHeader className="pb-2 bg-background/50 border-b border-border/50">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-heading uppercase text-xl text-primary">{slot.title}</CardTitle>
                      <Badge variant={slot.status === 'open' ? 'default' : 'secondary'} className="uppercase font-bold tracking-wider text-xs">
                        {slot.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground font-mono text-sm mb-4">
                      {format(new Date(slot.startTime), "MMM do, HH:mm")} - {format(new Date(slot.endTime), "HH:mm")}
                    </p>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-white uppercase tracking-wider">Capacity</span>
                      <span className="text-secondary">{slot.bookedCount} / {slot.capacity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-border clip-diagonal bg-card">
              <p className="text-muted-foreground font-heading text-xl uppercase tracking-widest">No deployments scheduled yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Dutch Warehouse / Contact Section */}
      <section id="contact-form" className="py-24 px-4 bg-card relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black text-primary uppercase mb-6">Op zoek naar een locatie</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Ben jij eigenaar van een loods of heb je 300-500m2 beschikbaar in de regio Wijchen? Wij zoeken een partner die samen met ons een binnenspeeltuin voor gel blasters wil starten. Ideaal voor ondernemers die hun ruimte willen verdelen. Neem contact op — samen bouwen we iets episch.
            </p>
          </motion.div>

          <div className="bg-background border border-border p-6 md:p-10 clip-diagonal shadow-[0_0_30px_rgba(30,144,255,0.1)]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="uppercase tracking-widest text-secondary font-bold">Contact Type</FormLabel>
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
                            <FormLabel className="font-bold cursor-pointer uppercase tracking-wider text-sm mt-1">Locatie Partner (Loods)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 bg-card p-4 border border-border clip-diagonal cursor-pointer hover:border-primary transition-colors flex-1">
                            <FormControl>
                              <RadioGroupItem value="general" />
                            </FormControl>
                            <FormLabel className="font-bold cursor-pointer uppercase tracking-wider text-sm mt-1">Algemeen / Interesse</FormLabel>
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
                          <Input placeholder="John Doe" className="bg-card border-border focus-visible:ring-primary clip-diagonal rounded-none h-12" {...field} />
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
                        <FormLabel className="uppercase tracking-widest text-xs">E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" className="bg-card border-border focus-visible:ring-primary clip-diagonal rounded-none h-12" {...field} />
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
                      <FormLabel className="uppercase tracking-widest text-xs">Telefoon (Optioneel)</FormLabel>
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
                          <FormLabel className="uppercase tracking-widest text-xs text-secondary">Grootte (m2)</FormLabel>
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
                  className="w-full bg-primary text-black hover:bg-primary/80 clip-diagonal h-14 text-lg font-bold uppercase tracking-wider"
                >
                  {submitContact.isPending ? "Verzenden..." : "Word locatiepartner"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-background border-t border-border text-center relative z-10">
        <p className="text-muted-foreground font-heading tracking-widest uppercase text-sm">
          © {new Date().getFullYear()} BlastArena Wijchen. All rights reserved.
        </p>
      </footer>
    </div>
  );
}