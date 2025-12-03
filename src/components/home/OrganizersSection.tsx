import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const organizers = [
  {
    name: "Baru",
    logo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop",
    category: "Bar & Lounge",
  },
  {
    name: "Kauai Gastrolounge",
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop",
    category: "Gastronomia",
  },
  {
    name: "Vista Joá",
    logo: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=200&fit=crop",
    category: "Eventos",
  },
  {
    name: "Quintal da Barra",
    logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop",
    category: "Bar & Eventos",
  },
  {
    name: "Samba Sunset Festival",
    logo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
    category: "Festival",
  },
  {
    name: "Casa de Shows RJ",
    logo: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=200&h=200&fit=crop",
    category: "Shows",
  },
  {
    name: "Arena Music",
    logo: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&h=200&fit=crop",
    category: "Eventos",
  },
];

const OrganizersSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Principais <span className="text-gradient">Organizadores</span>
            </h2>
            <p className="text-muted-foreground">
              Casas e produtores que confiam na Eventix
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {organizers.map((organizer, index) => (
            <motion.div
              key={organizer.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex-shrink-0 snap-center"
            >
              <div className="w-48 gradient-card rounded-2xl p-6 text-center hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 cursor-pointer group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 ring-2 ring-border group-hover:ring-primary transition-all">
                  <img
                    src={organizer.logo}
                    alt={organizer.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                  {organizer.name}
                </h3>
                <p className="text-sm text-muted-foreground">{organizer.category}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile scroll hint */}
        <div className="flex justify-center gap-2 mt-4 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroll("left")}
            className="rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroll("right")}
            className="rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default OrganizersSection;
