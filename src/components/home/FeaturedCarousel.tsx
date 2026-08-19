import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Ticket, Flame } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePublicEvents } from "@/hooks/useEvents";

const AUTOPLAY_MS = 5000;

const FeaturedCarousel = () => {
  const { data: events = [], isLoading } = usePublicEvents();
  const [api, setApi] = useState<CarouselApi>();
  const autoplayRef = useRef<number | null>(null);

  const highlighted = events.filter((e: any) => e.highlighted).slice(0, 6);

  useEffect(() => {
    if (!api) return;

    const start = () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
      autoplayRef.current = window.setInterval(() => {
        if (api.canScrollNext()) {
          api.scrollNext();
        } else {
          api.scrollTo(0);
        }
      }, AUTOPLAY_MS);
    };

    start();
    const onPointerDown = () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
    api.on("pointerDown", onPointerDown);
    api.on("settle", start);

    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
      api.off("pointerDown", onPointerDown);
      api.off("settle", start);
    };
  }, [api]);

  if (isLoading || highlighted.length === 0) return null;

  return (
    <section className="py-8 md:py-12 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 mb-6"
        >
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Em <span className="text-gradient">destaque</span>
          </h2>
        </motion.div>

        <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
          <CarouselContent>
            {highlighted.map((event: any) => (
              <CarouselItem key={event.id}>
                <Link to={`/evento/${event.id}`} className="group block">
                  <div className="relative rounded-3xl overflow-hidden aspect-[21/9] md:aspect-[3/1] border border-border/30 shadow-premium">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Ticket className="w-16 h-16 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                      {event.category && (
                        <span className="inline-block gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-3 shadow-premium">
                          {event.category}
                        </span>
                      )}
                      <h3 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-primary" />
                          {format(new Date(event.start_date), "dd MMM yyyy • HH:mm", { locale: ptBR })}
                        </span>
                        {event.city && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-accent" />
                            {event.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          {highlighted.length > 1 && (
            <>
              <CarouselPrevious className="left-2 md:left-4" />
              <CarouselNext className="right-2 md:right-4" />
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
