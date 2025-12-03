import { motion } from "framer-motion";
import EventCard from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// Mock data - will be replaced with real data from backend
const featuredEvents = [
  {
    id: "1",
    title: "Rock in Rio 2024 - Dia 1",
    date: "15 Set 2024 • 14:00",
    location: "Parque Olímpico, Rio de Janeiro",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800",
    price: 595,
    category: "Festival",
    availableTickets: 234,
  },
  {
    id: "2",
    title: "Stand-up Comedy com Fábio Porchat",
    date: "22 Set 2024 • 21:00",
    location: "Teatro Renault, São Paulo",
    image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
    price: 120,
    category: "Stand-up",
    availableTickets: 45,
  },
  {
    id: "3",
    title: "Flamengo x Palmeiras - Brasileirão",
    date: "28 Set 2024 • 16:00",
    location: "Maracanã, Rio de Janeiro",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
    price: 180,
    category: "Esportes",
    availableTickets: 1250,
  },
  {
    id: "4",
    title: "Workshop de Fotografia Digital",
    date: "05 Out 2024 • 09:00",
    location: "Centro de Convenções, Belo Horizonte",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800",
    price: 250,
    category: "Workshop",
    availableTickets: 30,
  },
  {
    id: "5",
    title: "Anitta World Tour 2024",
    date: "12 Out 2024 • 20:00",
    location: "Allianz Parque, São Paulo",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
    price: 350,
    category: "Show",
    availableTickets: 890,
  },
  {
    id: "6",
    title: "O Fantasma da Ópera - Musical",
    date: "18 Out 2024 • 20:30",
    location: "Teatro Santander, São Paulo",
    image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
    price: 280,
    category: "Teatro",
    availableTickets: 156,
  },
];

const FeaturedEvents = () => {
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
          {featuredEvents.map((event, index) => (
            <EventCard key={event.id} {...event} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
