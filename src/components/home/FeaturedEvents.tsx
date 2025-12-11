import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, MapPin, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Event = Tables<"events">;

interface EventWithPrice extends Event {
  min_price?: number;
}

const FeaturedEvents = () => {
  const [events, setEvents] = useState<EventWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("status", "published")
          .gte("start_date", new Date().toISOString())
          .order("start_date", { ascending: true })
          .limit(6);

        if (error) throw error;
        
        let eventsData = data || [];

        // Fetch minimum prices for each event
        if (eventsData.length > 0) {
          const eventIds = eventsData.map(e => e.id);
          const { data: ticketPrices } = await supabase
            .from("ticket_types")
            .select("event_id, price")
            .in("event_id", eventIds)
            .eq("is_active", true);

          const minPriceByEvent: Record<string, number> = {};
          ticketPrices?.forEach(ticket => {
            const price = Number(ticket.price);
            if (!minPriceByEvent[ticket.event_id] || price < minPriceByEvent[ticket.event_id]) {
              minPriceByEvent[ticket.event_id] = price;
            }
          });

          const eventsWithPrices = eventsData.map(event => ({
            ...event,
            min_price: minPriceByEvent[event.id],
          }));
          setEvents(eventsWithPrices);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <section id="eventos" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <div className="h-8 bg-muted rounded w-64 animate-pulse mx-auto mb-3" />
            <div className="h-4 bg-muted rounded w-96 animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-2xl h-64" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
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
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Ticket className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-4">
              Em breve, novos eventos
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Estamos preparando experiências incríveis para você. Fique ligado nas nossas redes sociais!
            </p>
            <a 
              href="https://instagram.com/quintalbarra" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-primary/30 hover:border-primary">
                Seguir no Instagram
              </Button>
            </a>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="eventos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-display font-semibold text-foreground mb-4 tracking-wide">
            Próximos Eventos
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Garanta seu ingresso e viva experiências únicas no Quintal
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Link to={`/evento/${event.id}`} className="group block">
                <div className="gradient-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 border border-border/30">
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Ticket className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    {event.category && (
                      <Badge className="absolute top-4 left-4 bg-primary/90 text-primary-foreground border-0">
                        {event.category}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-display text-xl font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>
                          {format(new Date(event.start_date), "dd 'de' MMMM • HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {event.venue_name && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="line-clamp-1">{event.venue_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div>
                        <span className="text-xs text-muted-foreground">A partir de</span>
                        <p className="text-lg font-semibold text-primary">
                          {event.min_price !== undefined 
                            ? `R$ ${event.min_price.toFixed(2)}`
                            : "Ver ingressos"}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {events.length >= 6 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link to="/eventos">
              <Button variant="outline" size="lg" className="border-primary/30 hover:border-primary group">
                Ver todos os eventos
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default FeaturedEvents;
