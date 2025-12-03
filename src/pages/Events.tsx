import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Calendar, MapPin, Users, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Event = Tables<"events">;

const categories = ["Todos", "Festival", "Show", "Stand-up", "Teatro", "Esportes", "Workshop", "Conferência"];

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("status", "published")
          .gte("start_date", new Date().toISOString())
          .order("start_date", { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchTerm.toLowerCase());
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
            {loading ? "Carregando..." : `${filteredEvents.length} eventos encontrados`}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-2xl h-64" />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
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
                            <p className="text-lg font-bold text-gradient">Ver ingressos</p>
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
          )}

          {!loading && filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <Ticket className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg">
                Nenhum evento encontrado com os filtros selecionados.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Tente ajustar os filtros ou volte mais tarde.
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