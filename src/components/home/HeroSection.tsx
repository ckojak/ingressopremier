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
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background z-0" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[120px]"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px]"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8 relative inline-block"
          >
            <img 
              src={premierpassLogo} 
              alt="PremierPass" 
              className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-2xl object-cover shadow-premium"
            />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{ 
                boxShadow: [
                  '0 0 20px hsl(250, 80%, 60%, 0.3)',
                  '0 0 40px hsl(250, 80%, 60%, 0.5)',
                  '0 0 20px hsl(250, 80%, 60%, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm md:text-base tracking-widest text-accent uppercase font-medium">
              Plataforma de Ingressos Premium
            </span>
            <Sparkles className="w-4 h-4 text-accent" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-foreground mb-4"
          >
            Premier<span className="text-gradient">Pass</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Sua porta de entrada para os melhores eventos. Compre ingressos com segurança e praticidade.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg" 
              className="gradient-primary text-primary-foreground hover:opacity-90 px-8 h-14 text-base font-semibold shadow-premium hover:shadow-accent transition-all"
              asChild
            >
              <Link to="/eventos">
                <Ticket className="w-5 h-5 mr-2" />
                Explorar Eventos
              </Link>
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-8 mt-16 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Pagamento Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm">Ingresso Digital</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm">Suporte 24h</span>
            </div>
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
          <span className="text-xs tracking-widest uppercase">Explore</span>
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