import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import { GraduationCap, Heart, Users, BadgePercent, FileCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const beneficiaries = [
  {
    icon: GraduationCap,
    title: "Estudantes",
    description: "Estudantes regularmente matriculados em instituições de ensino reconhecidas pelo MEC.",
    documents: ["Carteira de Identificação Estudantil (CIE)", "Documento de identidade com foto"],
  },
  {
    icon: Users,
    title: "Idosos (60+)",
    description: "Pessoas com idade igual ou superior a 60 anos.",
    documents: ["Documento de identidade com foto"],
  },
  {
    icon: Heart,
    title: "Pessoas com Deficiência",
    description: "Pessoas com deficiência e seu acompanhante, quando necessário.",
    documents: ["Cartão de Benefício de Prestação Continuada (BPC)", "Documento de identidade com foto"],
  },
  {
    icon: BadgePercent,
    title: "Jovens de Baixa Renda",
    description: "Jovens de 15 a 29 anos com renda per capita de até 2 salários mínimos.",
    documents: ["ID Jovem", "Documento de identidade com foto"],
  },
];

const HalfPrice = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Lei da Meia-Entrada"
        description="Saiba quem tem direito à meia-entrada e quais documentos são necessários."
        url="https://premierpass.com.br/meia-entrada"
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
              <BadgePercent className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Lei da <span className="text-gradient">Meia-Entrada</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A Lei Federal 12.933/2013 garante o benefício da meia-entrada para determinados 
              grupos em eventos artísticos, culturais e esportivos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-6 mb-12 flex items-start gap-4"
          >
            <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Importante</h3>
              <p className="text-muted-foreground text-sm">
                A disponibilidade de ingressos meia-entrada é limitada a 40% do total de ingressos 
                disponíveis para cada evento, conforme determina a legislação. A comprovação do 
                direito ao benefício deve ser feita na entrada do evento.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {beneficiaries.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card className="bg-card border-border h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{item.description}</p>
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-primary" />
                        Documentos necessários:
                      </h4>
                      <ul className="space-y-1">
                        {item.documents.map((doc, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="gradient-card rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-foreground mb-4">Como funciona na Premier Pass?</h2>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">1</span>
                <div>
                  <h3 className="font-medium text-foreground">Selecione o ingresso meia-entrada</h3>
                  <p className="text-muted-foreground text-sm">Escolha a opção de meia-entrada durante a compra, quando disponível.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">2</span>
                <div>
                  <h3 className="font-medium text-foreground">Complete a compra</h3>
                  <p className="text-muted-foreground text-sm">Finalize normalmente sua compra pelo site ou app.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">3</span>
                <div>
                  <h3 className="font-medium text-foreground">Apresente os documentos no evento</h3>
                  <p className="text-muted-foreground text-sm">Leve os documentos comprobatórios para validação na entrada.</p>
                </div>
              </li>
            </ol>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HalfPrice;
