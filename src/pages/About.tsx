import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import { Ticket, Users, Shield, Zap, Heart, Globe } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Segurança",
    description: "Transações protegidas com criptografia de ponta e processamento seguro via Stripe.",
  },
  {
    icon: Zap,
    title: "Agilidade",
    description: "Compra rápida em poucos cliques. Seus ingressos disponíveis instantaneamente.",
  },
  {
    icon: Heart,
    title: "Experiência",
    description: "Interface intuitiva pensada para facilitar sua jornada do início ao fim.",
  },
  {
    icon: Globe,
    title: "Alcance",
    description: "Conectamos você aos melhores eventos em todo o Brasil.",
  },
];

const stats = [
  { value: "10K+", label: "Eventos realizados" },
  { value: "500K+", label: "Ingressos vendidos" },
  { value: "1000+", label: "Organizadores" },
  { value: "98%", label: "Satisfação" },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sobre Nós"
        description="Conheça a Premier Pass, a plataforma que conecta você aos melhores eventos do Brasil."
        url="https://premierpass.com.br/sobre"
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
              <Ticket className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Sobre a <span className="text-gradient">Premier Pass</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Somos uma plataforma brasileira de venda de ingressos que nasceu com a missão de 
              conectar pessoas a experiências inesquecíveis. Acreditamos que eventos têm o poder 
              de transformar vidas e criar memórias.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            {stats.map((stat, index) => (
              <div key={index} className="gradient-card rounded-2xl p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="gradient-card rounded-3xl p-8 md:p-12 mb-20"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Nossa Missão</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Democratizar o acesso à cultura e entretenimento, oferecendo uma plataforma 
                  segura, acessível e eficiente para compra de ingressos.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Trabalhamos todos os dias para que cada pessoa possa viver experiências 
                  incríveis sem complicações, do momento da descoberta até o check-in no evento.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-48 h-48 rounded-full gradient-primary opacity-20 absolute blur-3xl" />
                <Users className="w-32 h-32 text-primary relative" />
              </div>
            </div>
          </motion.div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              Nossos <span className="text-gradient">Valores</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="gradient-card rounded-2xl p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
