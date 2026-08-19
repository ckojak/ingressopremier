import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { EVENT_CATEGORIES } from "@/lib/constants";

// Cidades em destaque pra descoberta rápida na home — mesmo padrão que a
// concorrência usa (link direto pra lista já filtrada), mas com a nossa cara.
const FEATURED_CITIES = [
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Salvador",
  "Brasília",
  "Recife",
];

const DiscoverBar = () => {
  return (
    <section className="py-12 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-premium rounded-2xl p-6 md:p-8 border border-border/30"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Cidades */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Eventos por cidade
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {FEATURED_CITIES.map((city) => (
                  <Link
                    key={city}
                    to={`/eventos?city=${encodeURIComponent(city)}`}
                    className="px-4 py-2 rounded-xl text-sm font-medium glass-premium border border-border/40 text-foreground hover:border-primary/40 hover:bg-primary/5 hover-lift transition-all"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/40 my-6" />

          {/* Categorias */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
              Explore por categoria
            </h3>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((category) => (
                <Link
                  key={category}
                  to={`/eventos?category=${encodeURIComponent(category)}`}
                  className="px-4 py-2 rounded-xl text-sm font-medium glass-premium border border-border/40 text-foreground hover:border-primary/40 hover:bg-primary/5 hover-lift transition-all"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DiscoverBar;
