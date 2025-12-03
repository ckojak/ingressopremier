import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EventCard from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

// Mock data
const allEvents = [
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
  {
    id: "7",
    title: "Lollapalooza Brasil 2024",
    date: "25 Out 2024 • 12:00",
    location: "Autódromo de Interlagos, São Paulo",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
    price: 890,
    category: "Festival",
    availableTickets: 500,
  },
  {
    id: "8",
    title: "Whindersson Nunes - Stand Up",
    date: "02 Nov 2024 • 21:00",
    location: "Ginásio do Ibirapuera, São Paulo",
    image: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800",
    price: 150,
    category: "Stand-up",
    availableTickets: 200,
  },
];

const categories = ["Todos", "Festival", "Show", "Stand-up", "Teatro", "Esportes", "Workshop"];

const Events = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const filteredEvents = allEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Todos os <span className="text-gradient">eventos</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Explore nossa seleção completa de eventos e encontre experiências incríveis para você.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="gradient-card rounded-2xl p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-background border-border"
                />
              </div>

              {/* Date Filter */}
              <Button variant="outline" className="h-12">
                <Calendar className="w-5 h-5 mr-2" />
                Qualquer data
              </Button>

              {/* Location Filter */}
              <Button variant="outline" className="h-12">
                <MapPin className="w-5 h-5 mr-2" />
                Qualquer local
              </Button>

              {/* More Filters */}
              <Button variant="outline" className="h-12">
                <Filter className="w-5 h-5 mr-2" />
                Filtros
              </Button>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Results Count */}
          <div className="mb-6 text-muted-foreground">
            {filteredEvents.length} eventos encontrados
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event, index) => (
              <EventCard key={event.id} {...event} index={index} />
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Nenhum evento encontrado com os filtros selecionados.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
