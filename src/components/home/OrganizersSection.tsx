import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import baruLogo from "@/assets/organizers/baru.png";
import kauaiLogo from "@/assets/organizers/kauai.jpg";
import sambaSunsetLogo from "@/assets/organizers/samba-sunset.jpg";
import vistaJoaLogo from "@/assets/organizers/vista-joa.jpg";

const organizers = [
  {
    name: "Baru",
    logo: baruLogo,
    category: "Bar & Lounge",
  },
  {
    name: "Kauai Gastrolounge",
    logo: kauaiLogo,
    category: "Gastronomia",
  },
  {
    name: "Vista Joá",
    logo: vistaJoaLogo,
    category: "Eventos",
  },
  {
    name: "Quintal da Barra",
    logo: null,
    category: "Bar & Eventos",
  },
  {
    name: "Samba Sunset Festival",
    logo: sambaSunsetLogo,
    category: "Festival",
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
              Casas e produtores que confiam na Premier Pass
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
                <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 ring-2 ring-border group-hover:ring-primary transition-all bg-secondary flex items-center justify-center">
                  {organizer.logo ? (
                    <img
                      src={organizer.logo}
                      alt={organizer.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {organizer.name.charAt(0)}
                    </span>
                  )}
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
