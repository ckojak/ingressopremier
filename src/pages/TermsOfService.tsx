import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Termos de Serviço"
        description="Leia os termos de serviço da plataforma Premier Pass para compra de ingressos."
        url="https://premierpass.com.br/termos"
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
              Termos de <span className="text-gradient">Serviço</span>
            </h1>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ao acessar e utilizar a plataforma Premier Pass, você concorda com estes Termos de Serviço. 
                  Se você não concordar com algum destes termos, não utilize nossos serviços.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Descrição dos Serviços</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass é uma plataforma digital que permite a compra e venda de ingressos para eventos. 
                  Atuamos como intermediários entre organizadores de eventos e consumidores, facilitando 
                  transações seguras.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Cadastro e Conta</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras 
                  e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Compra de Ingressos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todas as vendas são finais após a confirmação do pagamento. Reembolsos só serão processados 
                  em caso de cancelamento do evento pelo organizador ou conforme previsto em lei.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Taxas de Serviço</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass cobra uma taxa de serviço de 5% sobre o valor de cada ingresso vendido. 
                  Esta taxa cobre os custos de processamento de pagamento e manutenção da plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Transferência de Ingressos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ingressos podem ser transferidos para outros usuários através da plataforma. 
                  Após a transferência ser aceita, o ingresso original será invalidado e um novo 
                  será gerado para o destinatário.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">7. Propriedade Intelectual</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todo o conteúdo da plataforma, incluindo logotipos, textos, imagens e código, 
                  é propriedade da Premier Pass e está protegido por leis de direitos autorais.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">8. Modificações</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass reserva-se o direito de modificar estes termos a qualquer momento. 
                  Alterações significativas serão comunicadas aos usuários.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contato</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para dúvidas sobre estes termos, entre em contato através do e-mail: 
                  <a href="mailto:legal@premierpass.com.br" className="text-primary hover:underline ml-1">
                    legal@premierpass.com.br
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

export default TermsOfService;
