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
}

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
}: EventCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Link to={`/evento/${id}`} className="group block">
        <div className="gradient-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2">
          {/* Image */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <Badge className="absolute top-4 left-4 gradient-primary text-primary-foreground border-0">
              {category}
            </Badge>
            {availableTickets < 50 && (
              <Badge variant="destructive" className="absolute top-4 right-4">
                Últimos ingressos
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-bold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="line-clamp-1">{location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span>{availableTickets} ingressos disponíveis</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <span className="text-xs text-muted-foreground">A partir de</span>
                <p className="text-xl font-bold text-gradient">
                  R$ {price.toFixed(2).replace(".", ",")}
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
  );
};

export default EventCard;
