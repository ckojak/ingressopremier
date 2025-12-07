import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle, Headphones, Ticket, Star } from "lucide-react";

const trustFeatures = [
  {
    icon: Shield,
    title: "Compra Segura",
    description: "Proteção total em todas as transações",
  },
  {
    icon: Lock,
    title: "Dados Protegidos",
    description: "Sua privacidade é nossa prioridade",
  },
  {
    icon: CheckCircle,
    title: "Garantia de Autenticidade",
    description: "Ingressos 100% verificados",
  },
  {
    icon: Headphones,
    title: "Suporte 24/7",
    description: "Estamos sempre aqui para ajudar",
  },
];

const badges = [
  "Pagamento 100% Seguro",
  "Reembolso Garantido",
  "Suporte Especializado",
  "Ingressos Verificados",
  "Milhares de Eventos",
  "Avaliação 4.9/5",
];

const TrustSection = () => {
  return (
    <section className="py-20 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Por que confiar na <span className="text-gradient">Premier Pass</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Oferecemos a melhor experiência em compra de ingressos com total segurança e confiabilidade.
          </p>
        </motion.div>

        {/* Trust Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {trustFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="gradient-card rounded-2xl p-6 text-center"
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {badges.map((badge, index) => (
            <div
              key={badge}
              className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground"
            >
              <Star className="w-4 h-4 text-primary" />
              {badge}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
