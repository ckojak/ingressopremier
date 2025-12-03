import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket } from "lucide-react";
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
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-card rounded-2xl h-[400px]" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-16 bg-background">
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

  const formatEventDate = (startDate: string, endDate?: string | null) => {
    const start = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "dd", { locale: ptBR })} - ${format(end, "dd MMM", { locale: ptBR })}`;
      }
      return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM", { locale: ptBR })}`;
    }
    return format(start, "EEEE, dd MMM", { locale: ptBR });
  };

  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="group relative bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Ticket className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  
                  {/* Category Badge */}
                  {event.category && (
                    <Badge className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm text-foreground border-0 font-medium">
                      {event.category}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-foreground mb-3 line-clamp-1 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="line-clamp-1">
                        {event.venue_name ? `${event.venue_name} - ` : ""}
                        {event.city}{event.state ? `, ${event.state}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span className="capitalize">
                        {formatEventDate(event.start_date, event.end_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <span className="text-xs text-muted-foreground">A partir de</span>
                      <p className="text-xl font-bold text-primary">
                        {event.min_price !== undefined 
                          ? `R$ ${event.min_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "Grátis"}
                      </p>
                    </div>
                    <Button asChild size="sm" className="px-6">
                      <Link to={`/evento/${event.id}`}>Comprar</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
