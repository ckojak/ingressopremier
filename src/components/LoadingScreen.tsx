import { motion } from "framer-motion";
import { Ticket } from "lucide-react";

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
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
            animate={{ 
              boxShadow: [
                "0 0 20px hsl(190, 90%, 50%, 0.3)",
                "0 0 60px hsl(190, 90%, 50%, 0.5)",
                "0 0 20px hsl(190, 90%, 50%, 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Ticket className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <span className="text-4xl font-bold text-foreground">
            Event<span className="text-gradient">ix</span>
          </span>
        </div>

        {/* Loading bar container */}
        <div className="w-64 h-1 bg-secondary rounded-full overflow-hidden">
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
          Carregando...
        </motion.p>
      </motion.div>

      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-accent/10 rounded-full blur-[120px]" />
      </div>
    </motion.div>
  );
};

export default LoadingScreen;