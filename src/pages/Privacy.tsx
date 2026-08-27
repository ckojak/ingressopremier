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
                  telefone e CPF ao criar uma conta ou realizar compras. Também coletamos
                  automaticamente dados técnicos da transação (endereço IP, informações do
                  navegador/dispositivo) para fins de prevenção a fraudes, descritos na Seção 3.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Uso dos Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos seus dados para processar pedidos, emitir e validar ingressos,
                  fornecer suporte ao cliente e melhorar nossos serviços. Não vendemos suas
                  informações pessoais a terceiros.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  3. Prevenção a Fraudes
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para proteger compradores e organizadores contra fraude e uso indevido de
                  cartões, utilizamos dados técnicos da transação (IP, dispositivo) em conjunto
                  com o parceiro de pagamentos, para validar a legitimidade das compras. Esses
                  dados não são usados para nenhuma outra finalidade.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Proteção de Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas de segurança técnicas e organizacionais para proteger
                  seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
                  Utilizamos criptografia SSL/TLS em todas as transmissões de dados.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies para melhorar sua experiência de navegação, lembrar suas
                  preferências e analisar o tráfego do site. Um aviso de cookies é exibido no
                  primeiro acesso ao site, e você pode gerenciar suas preferências a qualquer
                  momento nas configurações do seu navegador.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  6. Compartilhamento de Dados
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Compartilhamos seus dados apenas com: organizadores de eventos (informações
                  necessárias para validação do ingresso na entrada); o processador de
                  pagamentos (Mercado Pago), para completar transações e prevenir fraudes; e,
                  quando você comprou um ingresso e o organizador contratou o recurso de
                  remarketing (Seção 7), seu e-mail poderá ser usado por aquele organizador
                  específico para divulgar novos eventos dele.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  7. Comunicações de Remarketing
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Organizadores de eventos podem contratar um recurso pago da plataforma para
                  enviar e-mails promocionais de novos eventos para pessoas que já compraram
                  ingressos deles anteriormente. Isso se baseia no legítimo interesse decorrente
                  dessa relação comercial prévia. Todo e-mail de remarketing contém um link de
                  descadastro, e essa preferência é respeitada em todos os envios futuros
                  daquele organizador. Detalhes completos na Seção 14 dos nossos{" "}
                  <a href="/termos" className="text-primary hover:underline">Termos de Serviço</a>.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">8. Seus Direitos (LGPD)</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Conforme a Lei Geral de Proteção de Dados, você tem direito a: acessar seus
                  dados, corrigir informações incorretas, solicitar exclusão de dados, revogar
                  consentimentos (incluindo se descadastrar de remarketing) e portar seus dados
                  para outro serviço.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">9. Retenção de Dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Mantemos seus dados pelo tempo necessário para fornecer nossos serviços ou
                  conforme exigido por lei. Dados de transações são mantidos por 5 anos para
                  fins fiscais.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contato do DPO</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para questões relacionadas à privacidade, contate nosso Encarregado de Proteção de Dados:
                  <a href="mailto:dpo@premierpass.com.br" className="text-primary hover:underline ml-1">
                    dpo@premierpass.com.br
                  </a>
                </p>
              </section>

              <p className="text-sm text-muted-foreground pt-8 border-t border-border">
                Última atualização: Agosto de 2026
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
