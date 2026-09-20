import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Calendar, MapPin, Ticket } from "lucide-react";
import { usePublicEvents } from "@/hooks/useEvents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Quantos eventos aparecem na grade do topo. Se houver mais, aparece o
// link "Ver todos os eventos".
const MAX_EVENTS_NO_TOPO = 6;

const priceLabel = (event: any) => {
  if (event.min_price === undefined) return "Ver ingressos";
  if (event.min_price === 0) return "Grátis";
  return `R$ ${event.min_price.toFixed(2).replace(".", ",")}`;
};

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: events = [] } = usePublicEvents();

  // Todos os eventos futuros, do mais próximo para o mais distante
  // (a ordem já vem do hook). Nada de "só o mais vendido".
  const visiveis = events.slice(0, MAX_EVENTS_NO_TOPO);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchTerm ? `/eventos?search=${encodeURIComponent(searchTerm)}` : "/eventos");
  };

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Glow de marca sutil — só um destaque no canto, não a tela inteira */}
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-10 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
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

          {/* Grade compacta com todos os eventos */}
          {visiveis.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="w-full"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visiveis.map((event: any) => (
                  <Link key={event.id} to={`/evento/${event.id}`} className="group block">
                    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                      <div className="aspect-square">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Ticket className="w-10 h-10 text-primary-foreground/60" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-display font-bold text-sm text-foreground line-clamp-1 mb-1.5">
                          {event.title}
                        </h3>
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mb-2.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary shrink-0" />
                            {format(new Date(event.start_date), "dd MMM, HH:mm", { locale: ptBR })}
                          </span>
                          {event.city && (
                            <span className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-3 h-3 text-accent shrink-0" />
                              <span className="truncate">{event.city}</span>
                            </span>
                          )}
                        </div>
                        <span className="inline-block rounded-full bg-accent text-accent-foreground font-semibold text-xs px-3 py-1">
                          {priceLabel(event)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {events.length > MAX_EVENTS_NO_TOPO && (
                <Link
                  to="/eventos"
                  className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Ver todos os eventos
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
