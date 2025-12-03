import { Flame } from "lucide-react";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="pt-8 pb-4">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 text-accent mb-3">
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">Eventos em Alta</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Eventos Imperdíveis
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base md:text-lg">
            Os shows e festivais mais aguardados do Brasil. Garanta seu ingresso com segurança e os melhores preços.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
