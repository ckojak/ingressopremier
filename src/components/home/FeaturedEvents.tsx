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
          .eq("is_featured", true)
          .gte("start_date", new Date().toISOString())
          .order("start_date", { ascending: true })
          .limit(6);

        if (error) throw error;
        
        let eventsData = data || [];
        
        // If no featured events, get recent published events
        if (eventsData.length === 0) {
          const { data: recentData } = await supabase
            .from("events")
            .select("*")
            .eq("status", "published")
            .gte("start_date", new Date().toISOString())
            .order("start_date", { ascending: true })
            .limit(6);
          eventsData = recentData || [];
        }

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
        console.error("Error fetching featured events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="h-8 bg-muted rounded w-64 animate-pulse mb-3" />
            <div className="h-4 bg-muted rounded w-96 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <Ticket className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Nenhum evento disponível no momento
            </h2>
            <p className="text-muted-foreground mb-6">
              Novos eventos serão adicionados em breve. Fique ligado!
            </p>
            <Link to="/auth">
              <Button>Seja um organizador</Button>
            </Link>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Eventos em <span className="text-gradient">destaque</span>
            </h2>
            <p className="text-muted-foreground max-w-md">
              Os eventos mais procurados desta semana. Garanta seu ingresso antes que esgote!
            </p>
          </div>
          <Link to="/eventos" className="mt-4 md:mt-0">
            <Button variant="ghost" className="group">
              Ver todos
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
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
                <div className="gradient-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2">
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
                      <Badge className="absolute top-4 left-4 gradient-primary text-primary-foreground border-0">
                        {event.category}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>
                          {format(new Date(event.start_date), "dd MMM yyyy • HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {event.city && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="line-clamp-1">
                            {event.venue_name && `${event.venue_name}, `}
                            {event.city}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <span className="text-xs text-muted-foreground">A partir de</span>
                        <p className="text-lg font-bold text-primary">
                          {event.min_price !== undefined 
                            ? `R$ ${event.min_price.toFixed(2)}`
                            : "Ver ingressos"}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-primary-foreground text-lg">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
