import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Política de Privacidade"
        description="Saiba como a Premier Pass protege seus dados pessoais e sua privacidade."
        url="https://premierpass.com.br/privacidade"
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-8">
              Política de <span className="text-gradient">Privacidade</span>
            </h1>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Coleta de Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Coletamos informações que você nos fornece diretamente, como nome, e-mail, 
                  telefone e dados de pagamento ao criar uma conta ou realizar compras.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Uso dos Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos seus dados para processar pedidos, enviar ingressos, 
                  fornecer suporte ao cliente e melhorar nossos serviços. Não vendemos 
                  suas informações pessoais a terceiros.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Proteção de Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas de segurança técnicas e organizacionais para proteger 
                  seus dados contra acesso não autorizado, alteração, divulgação ou destruição. 
                  Utilizamos criptografia SSL/TLS em todas as transmissões de dados.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies para melhorar sua experiência de navegação, lembrar suas 
                  preferências e analisar o tráfego do site. Você pode gerenciar suas preferências 
                  de cookies nas configurações do seu navegador.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Compartilhamento de Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Compartilhamos seus dados apenas com organizadores de eventos (informações 
                  necessárias para validação do ingresso) e processadores de pagamento para 
                  completar transações.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Seus Direitos (LGPD)</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a: 
                  acessar seus dados, corrigir informações incorretas, solicitar exclusão de dados, 
                  e portar seus dados para outro serviço.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">7. Retenção de Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Mantemos seus dados pelo tempo necessário para fornecer nossos serviços 
                  ou conforme exigido por lei. Dados de transações são mantidos por 5 anos 
                  para fins fiscais.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">8. Contato do DPO</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para questões relacionadas à privacidade, contate nosso Encarregado de Proteção de Dados:
                  <a href="mailto:dpo@premierpass.com.br" className="text-primary hover:underline ml-1">
                    dpo@premierpass.com.br
                  </a>
                </p>
              </section>

              <p className="text-sm text-muted-foreground pt-8 border-t border-border">
                Última atualização: Dezembro de 2024
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
