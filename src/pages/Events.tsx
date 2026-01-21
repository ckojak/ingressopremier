import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, MapPin, Ticket, Search, X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfDay, endOfDay, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { useSiteContext, detectSiteFromHostname } from "@/hooks/useSiteContext";
import { usePublicEvents, EventWithPrice, useInvalidateEvents } from "@/hooks/useEvents";
import { toast } from "sonner";

// Site filter options for PremierPass
const SITE_FILTER_OPTIONS = [
  { label: "Todos os sites", value: "all" },
  { label: "PremierPass", value: "premierpass" },
  { label: "Quintal", value: "quintal" },
];

const categories = ["Todos", ...EVENT_CATEGORIES];

const dateFilters = [
  { label: "Qualquer data", value: "all" },
  { label: "Hoje", value: "today" },
  { label: "Esta semana", value: "week" },
  { label: "Este mês", value: "month" },
  { label: "Escolher data", value: "custom" },
];

const Events = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedSite, setSelectedSite] = useState("all");
  const { showAllSiteEvents } = useSiteContext();
  const currentSite = detectSiteFromHostname();
  const { invalidatePublic } = useInvalidateEvents();
  
  // Use centralized events hook
  const { data: events = [], isLoading: loading, isFetching } = usePublicEvents();
  
  // Manual refresh function
  const handleRefresh = () => {
    invalidatePublic();
    toast.success("Lista de eventos atualizada!");
  };
  
  // Extract unique cities from events
  const cities = [...new Set(events.map(e => e.city).filter(Boolean))] as string[];

  const getDateRange = () => {
    const now = new Date();
    switch (selectedDateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfDay(now), end: endOfDay(addWeeks(now, 1)) };
      case "month":
        return { start: startOfDay(now), end: endOfDay(addMonths(now, 1)) };
      case "custom":
        if (customDate) {
          return { start: startOfDay(customDate), end: endOfDay(customDate) };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredEvents = events.filter((event) => {
    // Search filter
    const matchesSearch = 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = selectedCategory === "Todos" || event.category === selectedCategory;
    
    // Date filter
    const dateRange = getDateRange();
    let matchesDate = true;
    if (dateRange) {
      const eventDate = new Date(event.start_date);
      matchesDate = eventDate >= dateRange.start && eventDate <= dateRange.end;
    }

    // City filter
    const matchesCity = selectedCity === "all" || event.city === selectedCity;
    
    // Site filter (only for PremierPass which shows all sites)
    const eventSiteId = (event as any).site_id;
    const matchesSite = selectedSite === "all" || eventSiteId === selectedSite;
    
    return matchesSearch && matchesCategory && matchesDate && matchesCity && matchesSite;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Todos");
    setSelectedDateFilter("all");
    setCustomDate(undefined);
    setSelectedCity("all");
    setSelectedSite("all");
  };

  const hasActiveFilters = searchTerm || selectedCategory !== "Todos" || selectedDateFilter !== "all" || selectedCity !== "all" || selectedSite !== "all";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Header />
      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground mb-5">
              Todos os <span className="text-gradient">eventos</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-3xl leading-relaxed">
              Explore nossa seleção completa de eventos e encontre experiências incríveis para você.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="glass-premium rounded-2xl p-6 md:p-8 mb-8 border border-border/30"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar eventos, artistas, locais..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 glass-premium border-border/40 focus:border-primary/40 focus:ring-primary/20 rounded-xl text-base transition-all"
                  />
                </div>

                {/* Date Filter */}
                <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
                  <SelectTrigger className="h-12 w-full md:w-48 glass-premium border-border/40 rounded-xl">
                    <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                    <SelectValue placeholder="Data" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-border/40 rounded-xl">
                    {dateFilters.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Custom Date Picker */}
                {selectedDateFilter === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-12 w-full md:w-48 glass-premium border-border/40 rounded-xl hover:border-primary/40 transition-all">
                        {customDate ? format(customDate, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass-strong border-border/40 rounded-xl">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* City Filter */}
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="h-12 w-full md:w-48 glass-premium border-border/40 rounded-xl">
                    <MapPin className="w-4 h-4 mr-2 text-accent" />
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-border/40 rounded-xl">
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Site Filter - only show on PremierPass */}
                {showAllSiteEvents && (
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="h-12 w-full md:w-48 glass-premium border-border/40 rounded-xl">
                      <Ticket className="w-4 h-4 mr-2 text-primary" />
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent className="glass-strong border-border/40 rounded-xl">
                      {SITE_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="outline" className="h-12 glass-premium border-border/40 hover:border-primary/40 hover:bg-primary/5 rounded-xl transition-all hover-lift" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2.5">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      selectedCategory === category
                        ? "gradient-primary text-primary-foreground shadow-premium hover-lift"
                        : "glass-premium border border-border/40 text-foreground hover:border-primary/40 hover:bg-primary/5 hover-lift"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Results Count + Refresh Button */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-muted-foreground">
              {loading ? "Carregando..." : `${filteredEvents.length} eventos encontrados`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-2 glass-premium border-border/40 hover:border-primary/40 hover:bg-primary/5 rounded-xl transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
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
              {filteredEvents.map((event, index) => {
                const eventSiteId = (event as any).site_id;
                const siteBadge = eventSiteId === "quintal" 
                  ? { label: "Quintal", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" }
                  : eventSiteId === "premierpass"
                  ? { label: "PremierPass", className: "bg-primary/20 text-primary border-primary/30" }
                  : null;
                  
                return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                >
                  <Link to={`/evento/${event.id}`} className="group block">
                    <div className="gradient-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 border border-border/20 hover:border-primary/20">
                      {/* Image */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                            <Ticket className="w-16 h-16 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                          {event.category && (
                            <Badge className="gradient-primary text-primary-foreground border-0 font-semibold px-3 py-1 shadow-premium">
                              {event.category}
                            </Badge>
                          )}
                          {siteBadge && showAllSiteEvents && (
                            <Badge variant="outline" className={siteBadge.className}>
                              {siteBadge.label}
                            </Badge>
                          )}
                        </div>
                        {event.total_available === 0 && (
                          <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground border-0 font-semibold px-3 py-1">
                            Esgotado
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-display font-bold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-gradient transition-all duration-300">
                          {event.title}
                        </h3>

                        <div className="space-y-2.5 mb-4">
                          <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
                            <div className="w-8 h-8 rounded-lg glass-premium flex items-center justify-center">
                              <CalendarIcon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">
                              {format(new Date(event.start_date), "dd MMM yyyy • HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {event.city && (
                            <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
                              <div className="w-8 h-8 rounded-lg glass-premium flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-accent" />
                              </div>
                              <span className="line-clamp-1 font-medium">
                                {event.venue_name && `${event.venue_name}, `}
                                {event.city}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">A partir de</span>
                            <p className="text-lg font-bold text-gradient mt-1">
                              {event.total_available === 0 ? (
                                <span className="text-destructive">Esgotado</span>
                              ) : event.min_price !== undefined ? (
                                `R$ ${event.min_price.toFixed(2).replace(".", ",")}`
                              ) : (
                                "Ver ingressos"
                              )}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 shadow-premium">
                            <span className="text-primary-foreground text-lg">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
              })}
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
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
