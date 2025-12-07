import { motion } from "framer-motion";
import { Ticket } from "lucide-react";
import FloatingParticles from "./FloatingParticles";

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
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
      <FloatingParticles count={25} />

      {/* Central glow effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-gradient-radial from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 relative z-10"
      >
        {/* Ticket icon with gradient */}
        <motion.div
          className="relative"
          animate={{ 
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Ticket className="w-10 h-10 text-primary-foreground" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl gradient-primary opacity-50 blur-xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">
            Premier <span className="text-gradient">Pass</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 uppercase tracking-widest">
            Sua entrada para experiências únicas
          </p>
        </div>

        {/* Loading bar container */}
        <div className="w-64 h-1.5 bg-secondary rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full gradient-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </div>

        {/* Loading text */}
        <motion.p
          className="text-muted-foreground text-sm"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Preparando sua experiência...
        </motion.p>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-muted-foreground/50 text-xs">
          ©{new Date().getFullYear()} Premier Pass • Todos os direitos reservados
        </p>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
