import { motion } from "framer-motion";
import { Ticket } from "lucide-react";
import FloatingParticles from "./FloatingParticles";

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gradient-hero"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        setTimeout(() => {
          onLoadingComplete?.();
        }, 2500);
      }}
    >
      {/* Floating particles */}
      <FloatingParticles count={30} />

      {/* Central glow effect - Enhanced */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          className="w-[600px] h-[600px] bg-gradient-radial from-primary/25 via-accent/15 to-transparent rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 relative z-10"
      >
        {/* Ticket icon with enhanced gradient */}
        <motion.div
          className="relative"
          animate={{ 
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-28 h-28 rounded-3xl gradient-primary flex items-center justify-center shadow-premium animate-pulse-glow">
            <Ticket className="w-14 h-14 text-primary-foreground" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-3xl gradient-primary opacity-60 blur-2xl"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground mb-3">
            Premier<span className="text-gradient">Pass</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-3 uppercase tracking-[0.2em] font-semibold">
            Ingressos Premium
          </p>
        </div>

        {/* Enhanced loading bar container */}
        <div className="w-72 h-2 bg-secondary rounded-full overflow-hidden mt-6 border border-border/30">
          <motion.div
            className="h-full gradient-primary rounded-full shadow-[0_0_15px_hsl(252,85%,63%,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
        </div>

        {/* Loading text */}
        <motion.p
          className="text-muted-foreground text-sm md:text-base font-medium mt-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Preparando sua experiência...
        </motion.p>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-10 text-center">
        <p className="text-muted-foreground/60 text-xs md:text-sm font-medium">
          © {new Date().getFullYear()} PremierPass • Todos os direitos reservados
        </p>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;