import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown, Calendar } from "lucide-react";
import quintalLogo from "@/assets/quintal-logo.png";

const HeroSection = () => {
  const scrollToEvents = () => {
    document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background z-10" />
      
      {/* Ambient Light Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <img 
              src={quintalLogo} 
              alt="Quintal Barra" 
              className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full object-cover shadow-glow"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-sm md:text-base tracking-[0.3em] text-primary uppercase mb-4"
          >
            Barra da Tijuca • Rio de Janeiro
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-semibold text-foreground mb-4 tracking-wider"
          >
            QUINTAL
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm md:text-base tracking-[0.4em] text-primary/80 uppercase mb-8"
          >
            Gastro Music Bar
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-xl mx-auto font-light"
          >
            Onde o Rio se encontra. Alta gastronomia, música na medida, drinks e aquela vibe boa.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 text-base tracking-wide"
              asChild
            >
              <Link to="/eventos">
                <Calendar className="w-5 h-5 mr-2" />
                Ver Programação
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={scrollToEvents}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-muted-foreground hover:text-primary transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs tracking-[0.2em] uppercase">Explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.button>
    </section>
  );
};

export default HeroSection;
