import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Mail, Phone, HelpCircle, Ticket, CreditCard, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("E-mail inválido").max(255),
  subject: z.string().min(5, "Assunto deve ter pelo menos 5 caracteres").max(200),
  message: z.string().min(20, "Mensagem deve ter pelo menos 20 caracteres").max(2000),
});

const faqs = [
  {
    question: "Como faço para comprar ingressos?",
    answer: "Navegue pelos eventos disponíveis, selecione o evento desejado, escolha o tipo e quantidade de ingressos e finalize a compra com cartão de crédito via Stripe.",
  },
  {
    question: "Como acesso meus ingressos após a compra?",
    answer: "Seus ingressos ficam disponíveis na seção 'Meus Ingressos' após o login. Você pode visualizar o QR Code e apresentar na entrada do evento.",
  },
  {
    question: "Posso transferir meu ingresso para outra pessoa?",
    answer: "Sim! Na página 'Meus Ingressos', você pode transferir ingressos não utilizados para outros usuários através do e-mail deles.",
  },
  {
    question: "Como funciona o reembolso?",
    answer: "Reembolsos são processados apenas em caso de cancelamento do evento pelo organizador. O valor é devolvido automaticamente ao cartão usado na compra.",
  },
  {
    question: "Posso usar cupom de desconto?",
    answer: "Sim! Cupons podem ser aplicados no carrinho antes de finalizar a compra. Cada cupom tem regras específicas definidas pelo organizador.",
  },
  {
    question: "O que é a Lei da Meia-Entrada?",
    answer: "A Lei da Meia-Entrada garante 50% de desconto para estudantes, idosos, pessoas com deficiência e jovens de baixa renda. Verifique se o evento oferece este benefício.",
  },
];

const Support = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = contactSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);

    toast({
      title: "Mensagem enviada!",
      description: "Responderemos em até 24 horas úteis.",
    });
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Suporte"
        description="Central de ajuda e suporte da Premier Pass. Tire suas dúvidas sobre compra de ingressos."
        url="https://premierpass.com.br/suporte"
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Central de <span className="text-gradient">Suporte</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Estamos aqui para ajudar! Encontre respostas para suas dúvidas ou entre em contato conosco.
            </p>
          </motion.div>

          {/* Contact Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid md:grid-cols-3 gap-6 mb-16"
          >
            <Card className="bg-card border-border text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">E-mail</h3>
                <p className="text-muted-foreground text-sm">suporte@premierpass.com.br</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Chat</h3>
                <p className="text-muted-foreground text-sm">Disponível 24/7</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Resposta</h3>
                <p className="text-muted-foreground text-sm">Em até 24h úteis</p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* FAQ */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                Perguntas Frequentes
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="bg-card border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-foreground hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" />
                Fale Conosco
              </h2>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Assunto</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Sobre o que deseja falar?"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Descreva sua dúvida ou problema..."
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Enviando..." : "Enviar Mensagem"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
