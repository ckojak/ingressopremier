import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Ticket, Gift } from "lucide-react";

const PromoBanner = () => {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Background with animated gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient" />
          
          {/* Overlay pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent_50%)]" />
          </div>

          {/* Floating elements */}
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute top-4 right-10 opacity-30"
          >
            <Ticket className="w-16 h-16 text-white" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute bottom-4 left-10 opacity-30"
          >
            <Gift className="w-12 h-12 text-white" />
          </motion.div>

          {/* Content */}
          <div className="relative z-10 py-12 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Oferta Especial</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                Ganhe 10% OFF no primeiro ingresso!
              </h2>
              <p className="text-white/80 md:text-lg max-w-xl">
                Crie sua conta agora e aproveite desconto exclusivo na sua primeira compra. 
                Use o cupom <span className="font-mono font-bold bg-white/20 px-2 py-1 rounded">BEMVINDO10</span>
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 shadow-xl group font-semibold"
              >
                <Link to="/auth">
                  Criar conta grátis
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PromoBanner;
