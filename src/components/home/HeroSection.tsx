import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gradient-hero">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Mais de 10.000 eventos disponíveis</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-tight"
          >
            Descubra eventos
            <br />
            <span className="text-gradient">incríveis</span> perto de você
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Shows, festivais, teatro, esportes e muito mais. 
            Encontre os melhores eventos e garanta seu ingresso com segurança.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar eventos, artistas, locais..."
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <Button variant="hero" size="xl" asChild>
              <Link to="/eventos">Explorar eventos</Link>
            </Button>
            <Button variant="outline" size="xl" asChild className="border-primary/50 hover:bg-primary/10">
              <Link to="/auth">Entre ou cadastre-se</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            {["Shows", "Festivais", "Teatro", "Esportes", "Stand-up", "Workshops"].map((category) => (
              <Link
                key={category}
                to={`/eventos?categoria=${category.toLowerCase()}`}
                className="px-4 py-2 rounded-full glass text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                {category}
              </Link>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
