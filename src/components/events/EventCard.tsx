import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  price: number;
  category: string;
  availableTickets: number;
  index?: number;
  siteId?: string;
}

// Site badge configuration
const SITE_BADGES: Record<string, { label: string; className: string }> = {
  premierpass: { 
    label: "PremierPass", 
    className: "bg-primary/20 text-primary border-primary/30" 
  },
};

const EventCard = ({
  id,
  title,
  date,
  location,
  image,
  price,
  category,
  availableTickets,
  index = 0,
  siteId,
}: EventCardProps) => {
  const siteBadge = siteId ? SITE_BADGES[siteId] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Link to={`/evento/${id}`} className="group block">
        <div className="gradient-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2">
          {/* Image */}
          <div className="relative aspect-[3/2] sm:aspect-[16/10] overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2">
              <Badge className="gradient-primary text-primary-foreground border-0">
                {category}
              </Badge>
              {siteBadge && (
                <Badge variant="outline" className={siteBadge.className}>
                  {siteBadge.label}
                </Badge>
              )}
            </div>
            {availableTickets < 50 && (
              <Badge variant="destructive" className="absolute top-3 right-3 sm:top-4 sm:right-4">
                Últimos ingressos
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5">
            <h3 className="font-bold text-base sm:text-lg text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="line-clamp-1">{location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span>{availableTickets} ingressos disponíveis</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
              <div>
                <span className="text-xs text-muted-foreground">A partir de</span>
                <p className="text-lg sm:text-xl font-bold text-gradient">
                  R$ {price.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-primary-foreground text-lg">→</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;