import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, MapPin, Ticket, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePublicEvents, EventWithPrice } from "@/hooks/useEvents";
import EventCardSkeleton from "@/components/skeletons/EventCardSkeleton";

const FeaturedEvents = () => {
  const { data: allEvents = [], isLoading: loading } = usePublicEvents();
  
  // Take only the first 6 events for featured section
  const events: EventWithPrice[] = allEvents.slice(0, 6);

  if (loading) {
    return (
      <section id="eventos" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-sm tracking-[0.2em] text-accent uppercase font-semibold">Destaques</span>
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-5">
              Próximos <span className="text-gradient">Eventos</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Garanta seu ingresso e viva experiências únicas
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section id="eventos" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-premium">
              <Ticket className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Em breve, novos eventos
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Estamos preparando experiências incríveis para você. Fique ligado nas nossas redes sociais!
            </p>
            <a 
              href="https://instagram.com/premierpass" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-primary/30 hover:border-primary hover:bg-primary/10">
                Seguir no Instagram
              </Button>
            </a>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="eventos" className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-sm tracking-[0.2em] text-accent uppercase font-semibold">Destaques</span>
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-5">
            Próximos <span className="text-gradient">Eventos</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Garanta seu ingresso e viva experiências únicas
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {events.map((event, index) => {
            const eventSiteId = (event as any).site_id;
            const siteBadge = eventSiteId === "premierpass"
              ? { label: "PremierPass", className: "bg-primary/20 text-primary border-primary/30" }
              : null;
              
            return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
            >
              <Link to={`/evento/${event.id}`} className="group block">
                <div className="gradient-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 border border-border/20 hover:border-primary/20">
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                        <Ticket className="w-16 h-16 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      {event.category && (
                        <Badge className="gradient-primary text-primary-foreground border-0 font-semibold px-3 py-1 shadow-premium">
                          {event.category}
                        </Badge>
                      )}
                      {siteBadge && (
                        <Badge variant="outline" className={siteBadge.className}>
                          {siteBadge.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4 line-clamp-2 group-hover:text-gradient transition-all duration-300">
                      {event.title}
                    </h3>

                    <div className="space-y-2.5 mb-5">
                      <div className="flex items-center gap-2.5 text-muted-foreground text-sm md:text-base">
                        <div className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">
                          {format(new Date(event.start_date), "dd 'de' MMMM • HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {event.venue_name && (
                        <div className="flex items-center gap-2.5 text-muted-foreground text-sm md:text-base">
                          <div className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-accent" />
                          </div>
                          <span className="line-clamp-1 font-medium">{event.venue_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-border/40">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">A partir de</span>
                        <p className="text-xl md:text-2xl font-bold text-gradient mt-1">
                          {event.min_price !== undefined 
                            ? `R$ ${event.min_price.toFixed(2)}`
                            : "Ver ingressos"}
                        </p>
                      </div>
                      <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 shadow-premium">
                        <ArrowRight className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
          })}
        </div>

        {events.length >= 6 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-center mt-16"
          >
            <Link to="/eventos">
              <Button variant="outline" size="lg" className="border-border/40 hover:border-primary/40 hover:bg-primary/5 group rounded-xl px-8 h-14 text-base font-semibold shadow-subtle hover:shadow-premium transition-all duration-300 hover-lift">
                Ver todos os eventos
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default FeaturedEvents;