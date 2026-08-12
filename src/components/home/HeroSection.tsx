import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown, Ticket, Sparkles } from "lucide-react";
import premierpassLogo from "@/assets/premierpass-logo.png";

const HeroSection = () => {
  const scrollToEvents = () => {
    document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 gradient-hero z-0" />
      
      {/* Animated gradient orbs with improved styling */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[180px]"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/12 rounded-full blur-[150px]"
          animate={{ 
            scale: [1.3, 1, 1.3],
            opacity: [0.12, 0.22, 0.12]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px]"
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.08, 0.18, 0.08]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="mb-10 relative inline-block"
          >
            <img 
              src={premierpassLogo} 
              alt="PremierPass — plataforma de ingressos para eventos" 
              className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-3xl object-cover shadow-premium hover-glow"
            />
            <motion.div
              className="absolute inset-0 rounded-3xl"
              animate={{ 
                boxShadow: [
                  '0 0 25px hsl(252, 85%, 63%, 0.35)',
                  '0 0 50px hsl(252, 85%, 63%, 0.55)',
                  '0 0 25px hsl(252, 85%, 63%, 0.35)'
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-sm md:text-base tracking-[0.2em] text-accent uppercase font-semibold">
              Plataforma de Ingressos Premium
            </span>
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-6xl md:text-7xl lg:text-8xl font-display font-bold text-foreground mb-6 leading-[1.05]"
          >
            Premier<span className="text-gradient">Pass</span>
            <span className="block text-2xl md:text-3xl lg:text-4xl mt-4 font-semibold text-muted-foreground">
              Ingressos para os melhores eventos do Brasil
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xl md:text-2xl text-muted-foreground mb-14 max-w-3xl mx-auto font-light leading-relaxed"
          >
            Sua porta de entrada para os melhores eventos. Compre ingressos com segurança e praticidade.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-5 justify-center items-center"
          >
            <Button 
              size="lg" 
              className="gradient-primary text-primary-foreground hover:opacity-90 px-10 h-16 text-lg font-semibold shadow-premium hover:shadow-accent transition-all duration-300 rounded-2xl hover-lift"
              asChild
            >
              <Link to="/eventos">
                <Ticket className="w-6 h-6 mr-2" />
                Explorar Eventos
              </Link>
            </Button>
          </motion.div>

          {/* Enhanced trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-20 text-muted-foreground"
          >
            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] group-hover:scale-125 transition-transform" />
              <span className="text-sm md:text-base font-medium group-hover:text-foreground transition-colors">Pagamento Seguro</span>
            </div>
            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(252,85%,63%,0.4)] group-hover:scale-125 transition-transform" />
              <span className="text-sm md:text-base font-medium group-hover:text-foreground transition-colors">Ingresso Digital</span>
            </div>
            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_hsl(282,75%,58%,0.4)] group-hover:scale-125 transition-transform" />
              <span className="text-sm md:text-base font-medium group-hover:text-foreground transition-colors">Suporte 24h</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={scrollToEvents}
        aria-label="Rolar para a lista de eventos"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-muted-foreground hover:text-primary transition-all duration-300 group"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs tracking-[0.2em] uppercase font-medium group-hover:text-primary transition-colors">Explore</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full glass-premium flex items-center justify-center group-hover:border-primary/30 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.button>
    </section>
  );
};

export default HeroSection;