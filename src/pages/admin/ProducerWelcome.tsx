import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Ticket,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Play,
  Sparkles,
  BarChart3,
  Gift,
  QrCode,
  Tag,
  Star,
  Rocket,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import premierpassLogo from "@/assets/premierpass-logo.png";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action: string;
  path: string;
}

const ProducerWelcome = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState("Produtor");
  const [showTutorial, setShowTutorial] = useState(true);
  const [eventsCount, setEventsCount] = useState(0);
  const navigate = useNavigate();

  const tutorialSteps: TutorialStep[] = [
    {
      id: 1,
      title: "Crie seu primeiro evento",
      description: "Adicione todos os detalhes do seu evento: nome, data, local, descrição e imagem de capa.",
      icon: Calendar,
      completed: eventsCount > 0,
      action: "Criar Evento",
      path: "/admin/eventos",
    },
    {
      id: 2,
      title: "Configure tipos de ingresso",
      description: "Defina diferentes categorias como VIP, Pista, Camarote com preços e quantidades.",
      icon: Ticket,
      completed: false,
      action: "Ver Ingressos",
      path: "/admin/ingressos",
    },
    {
      id: 3,
      title: "Crie cupons de desconto",
      description: "Atraia mais público oferecendo cupons promocionais para seus eventos.",
      icon: Tag,
      completed: false,
      action: "Criar Cupons",
      path: "/admin/cupons",
    },
    {
      id: 4,
      title: "Gerencie sua equipe de check-in",
      description: "Adicione colaboradores para validar ingressos na entrada do evento.",
      icon: Users,
      completed: false,
      action: "Gerenciar Equipe",
      path: "/admin/equipe",
    },
  ];

  const features = [
    {
      icon: Calendar,
      title: "Criar Eventos",
      description: "Publique eventos incríveis com todas as informações necessárias.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Ticket,
      title: "Vender Ingressos",
      description: "Configure tipos de ingressos com diferentes preços e lotes.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: BarChart3,
      title: "Acompanhar Vendas",
      description: "Monitore suas vendas em tempo real com relatórios detalhados.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: QrCode,
      title: "Check-in Rápido",
      description: "Valide ingressos na entrada com leitura de QR Code.",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Tag,
      title: "Cupons de Desconto",
      description: "Crie promoções e códigos de desconto para atrair público.",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Gift,
      title: "Cortesias",
      description: "Gere ingressos cortesia para convidados especiais.",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const name = userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0] || "Produtor";
        setUserName(name.split(" ")[0]);

        // Check events count
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("organizer_id", userData.user.id);

        setEventsCount(count || 0);
      }
    };

    fetchUserData();
  }, []);

  const completedSteps = tutorialSteps.filter((s) => s.completed).length;
  const progressPercent = (completedSteps / tutorialSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={premierpassLogo} alt="PremierPass" className="w-10 h-10 rounded-xl" />
            <div>
              <span className="text-xl font-bold text-foreground">
                Premier<span className="text-gradient">Pass</span>
              </span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">
                Painel do Produtor
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
              <Star className="w-3 h-3 mr-1" />
              Produtor
            </Badge>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/produtor")}>
              Ir para Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-primary to-accent mb-6"
          >
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bem-vindo, {userName}! 🎉
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Você agora é um produtor de eventos na PremierPass. Aqui você pode criar, gerenciar e vender ingressos para seus eventos.
          </p>
        </motion.div>

        {/* Tutorial Progress */}
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Rocket className="w-5 h-5 text-primary" />
                      Primeiros Passos
                    </CardTitle>
                    <CardDescription>
                      Complete estas etapas para começar a vender ingressos
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTutorial(false)}
                    className="text-muted-foreground"
                  >
                    Ocultar
                  </Button>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium text-primary">
                      {completedSteps}/{tutorialSteps.length} completos
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tutorialSteps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <Card
                        className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg hover:border-primary/40 ${
                          step.completed ? "bg-green-500/5 border-green-500/30" : ""
                        } ${currentStep === index ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setCurrentStep(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                step.completed
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {step.completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <step.icon className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-foreground mb-1">
                                {step.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {step.description}
                              </p>
                            </div>
                          </div>
                          <Link to={step.path}>
                            <Button
                              size="sm"
                              className="w-full mt-3 gap-1"
                              variant={step.completed ? "outline" : "default"}
                            >
                              {step.action}
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </CardContent>
                        {step.completed && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-[10px]">
                              ✓ Feito
                            </Badge>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            O que você pode fazer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div
                      className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Pronto para começar?
                  </h3>
                  <p className="text-muted-foreground">
                    Crie seu primeiro evento e comece a vender ingressos agora mesmo!
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/admin/eventos">
                    <Button size="lg" className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
                      <Calendar className="w-5 h-5" />
                      Criar Evento
                    </Button>
                  </Link>
                  <Link to="/admin/produtor">
                    <Button size="lg" variant="outline" className="gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Ver Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Precisa de ajuda?</h4>
                  <p className="text-sm text-muted-foreground">
                    Nossa equipe de suporte está disponível para ajudá-lo a qualquer momento.
                  </p>
                </div>
                <Link to="/suporte">
                  <Button variant="outline" className="gap-1">
                    Falar com Suporte
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProducerWelcome;
