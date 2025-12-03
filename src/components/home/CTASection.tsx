import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 bg-card/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 gradient-primary opacity-90" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative z-10 py-16 px-8 md:py-24 md:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm text-white">Para organizadores de eventos</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 max-w-2xl mx-auto">
              Crie e gerencie seus eventos com facilidade
            </h2>

            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Plataforma completa para venda de ingressos, controle de acesso 
              e gestão financeira do seu evento.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button variant="glass" size="xl" className="bg-white text-primary hover:bg-white/90">
                  Começar agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/eventos">
                <Button variant="glass" size="xl">
                  Ver eventos
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
