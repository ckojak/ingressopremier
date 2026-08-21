import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Calendar, MapPin, Ticket } from "lucide-react";
import { usePublicEvents } from "@/hooks/useEvents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: events = [] } = usePublicEvents();

  // Card em destaque: pega o evento mais vendido, ou o marcado como
  // "destaque" pelo produtor, ou simplesmente o próximo a acontecer.
  const featured =
    [...events].sort((a: any, b: any) => (b.total_sold ?? 0) - (a.total_sold ?? 0))[0] ||
    events.find((e: any) => e.highlighted) ||
    events[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchTerm ? `/eventos?search=${encodeURIComponent(searchTerm)}` : "/eventos");
  };

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Glow de marca sutil — só um destaque no canto, não a tela inteira */}
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Coluna do texto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 text-primary text-xs font-semibold tracking-wide uppercase mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ingressos verificados
            </div>

            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] mb-6">
              Seu próximo <span className="text-primary">evento favorito</span> começa aqui.
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Shows, festas e experiências com QR Code exclusivo e pagamento 100% seguro.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar shows, festas, teatro..."
                  className="pl-12 h-14 rounded-full border-border text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-8 rounded-full font-semibold">
                Buscar
              </Button>
            </form>
          </motion.div>

          {/* Card do evento em destaque, flutuante */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:justify-self-end w-full max-w-md"
            >
              <Link to={`/evento/${featured.id}`} className="group block">
                <div className="rounded-3xl overflow-hidden border border-border shadow-premium bg-card transition-transform duration-300 group-hover:-translate-y-1">
                  <div className="relative aspect-[4/3]">
                    {featured.image_url ? (
                      <img
                        src={featured.image_url}
                        alt={featured.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Ticket className="w-16 h-16 text-primary-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-display font-bold text-xl text-foreground mb-2 line-clamp-1">
                      {featured.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        {format(new Date(featured.start_date), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                      {featured.city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-accent" />
                          {featured.city}
                        </span>
                      )}
                    </div>
                    <span className="inline-block rounded-full bg-accent text-accent-foreground font-semibold text-sm px-4 py-2">
                      {featured.min_price !== undefined
                        ? `R$ ${featured.min_price.toFixed(2)}`
                        : "Ver ingressos"}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
