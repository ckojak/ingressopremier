import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import { COMPANY_CNPJ, WHATSAPP_DISPLAY } from "@/lib/constants";

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
                  Ao acessar e utilizar a plataforma Premier Pass, você concorda integralmente com estes
                  Termos de Serviço e com nossa Política de Privacidade. Se você não concordar com algum
                  destes termos, não utilize nossos serviços.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Definições</h2>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Plataforma:</strong> o site e aplicativo Premier Pass.<br />
                  <strong className="text-foreground">Organizador:</strong> pessoa física ou jurídica que cadastra
                  e vende ingressos de um evento através da Plataforma.<br />
                  <strong className="text-foreground">Comprador:</strong> pessoa que adquire um ingresso através
                  da Plataforma.<br />
                  <strong className="text-foreground">Ingresso:</strong> documento digital (com QR Code exclusivo)
                  que dá direito de acesso a um evento.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Descrição dos Serviços</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass é uma plataforma tecnológica que viabiliza a divulgação e venda de ingressos
                  para eventos de terceiros. Atuamos exclusivamente como intermediários entre Organizadores e
                  Compradores, licenciando o uso da nossa tecnologia de venda, emissão e validação de ingressos.
                  A Premier Pass não organiza, promove, produz ou realiza os eventos anunciados na Plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Cadastro e Conta</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras,
                  completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais
                  de acesso e por toda atividade realizada em sua conta. É necessário ter idade mínima de 18 anos
                  para se cadastrar, ou estar devidamente representado por responsável legal.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  5. Papel do Organizador e Responsabilidade pelo Evento
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ao adquirir um ingresso, o Comprador estabelece uma relação direta com o Organizador do
                  evento, que é o único e exclusivo responsável pela realização, qualidade, atrações, alteração,
                  adiamento ou cancelamento do evento, bem como pela veracidade das informações divulgadas
                  (data, horário, local, classificação etária, política de meia-entrada e política de reembolso
                  específica do evento, quando houver).
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  O Organizador se compromete a cumprir a legislação aplicável, incluindo normas de proteção ao
                  consumidor e legislação anticorrupção (Lei 12.846/2013), e a não publicar conteúdo falso,
                  ilegal, discriminatório ou que viole direitos de terceiros.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Compra de Ingressos e Pagamento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Os ingressos podem ser adquiridos via PIX ou cartão de crédito/débito, processados através de
                  parceiro de pagamentos homologado. Após a confirmação do pagamento, o ingresso digital é
                  emitido automaticamente e disponibilizado na conta do Comprador e por e-mail.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">7. Taxa de Serviço</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass cobra uma taxa de serviço de 8% sobre o valor de cada ingresso vendido. Esta
                  taxa é exibida ao Comprador antes da finalização da compra e cobre os custos de processamento
                  de pagamento, infraestrutura e manutenção da Plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  8. Cancelamento, Reembolso e Direito de Arrependimento
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  8.1. Nos termos do Código de Defesa do Consumidor, o Comprador pode exercer o direito de
                  arrependimento em até 7 (sete) dias corridos contados da data da compra, desde que a
                  solicitação seja feita com antecedência mínima de 48 (quarenta e oito) horas do início do
                  evento. Compras feitas com menos de 48 horas de antecedência do evento não são passíveis
                  deste tipo de cancelamento.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  8.2. Em caso de cancelamento, adiamento ou alteração relevante do evento por decisão do
                  Organizador, o valor de face do ingresso será reembolsado ao Comprador conforme as instruções
                  fornecidas pelo Organizador, respeitados os prazos legais. A taxa de serviço da Premier Pass
                  poderá não ser reembolsada nesses casos, salvo disposição legal em contrário.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  8.3. O prazo de devolução do valor varia conforme o meio de pagamento utilizado (em geral, até
                  5 dias úteis para PIX e conforme o ciclo de fatura da operadora para cartão de crédito).
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  8.4. Caso o Comprador solicite o cancelamento da cobrança diretamente à instituição financeira
                  (chargeback) sem seguir os canais desta Plataforma, e a contestação seja posteriormente
                  considerada improcedente, o Comprador poderá ser responsabilizado por eventuais tarifas
                  cobradas pela processadora de pagamentos em razão do estorno.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">9. Meia-Entrada</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ingressos de meia-entrada seguem a Lei 12.933/2013 e o Decreto 8.537/2015. O beneficiário deve
                  apresentar documento comprobatório válido no momento do acesso ao evento. A Premier Pass e o
                  Organizador podem recusar o acesso caso a comprovação não seja apresentada.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">10. Cortesias</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ingressos de cortesia, quando concedidos pelo Organizador, seguem as mesmas regras de
                  validação e uso único dos ingressos pagos, não sendo passíveis de reembolso por não terem
                  custo associado.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">11. Transferência de Ingressos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ingressos podem ser transferidos para outros usuários através da Plataforma, quando essa
                  funcionalidade estiver habilitada pelo Organizador para o evento em questão. Após a
                  transferência ser aceita, o ingresso original é invalidado e um novo é gerado para o
                  destinatário, que passa a ser o único autorizado a utilizá-lo.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  12. Guarda e Segurança do Ingresso
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  O ingresso digital e seu QR Code são de guarda exclusiva do Comprador. A Premier Pass
                  recomenda não compartilhar prints, capturas de tela ou o código do ingresso publicamente,
                  inclusive em redes sociais, pois qualquer pessoa que apresente o QR Code válido primeiro
                  poderá ter acesso ao evento. A Premier Pass não se responsabiliza pelo uso indevido de
                  ingressos divulgados ou compartilhados pelo próprio titular.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  13. Prevenção a Fraudes e Segurança de Pagamento
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para proteger Compradores e Organizadores contra fraude e uso indevido de cartões, a Premier
                  Pass pode coletar e processar dados técnicos da transação (como endereço IP, informações do
                  navegador/dispositivo) e utilizá-los, junto ao parceiro de pagamentos, para validar a
                  legitimidade da compra. A Premier Pass se reserva o direito de recusar ou cancelar
                  transações identificadas como suspeitas de fraude.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  14. Comunicações de Remarketing por Organizadores
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Organizadores podem, mediante contratação de recurso pago da Plataforma, enviar comunicações
                  por e-mail a pessoas que compraram ingressos em eventos anteriores organizados por eles
                  mesmos, com o objetivo de divulgar novos eventos.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  14.1. Base legal: este uso se apoia no legítimo interesse do Organizador em manter contato
                  com seu próprio público, decorrente de relação comercial prévia (a compra do ingresso), nos
                  termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  14.2. Escopo: cada Organizador só pode enviar comunicações para compradores de seus próprios
                  eventos. A Premier Pass não compartilha, vende, nem disponibiliza esses dados para terceiros
                  ou para outros Organizadores.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  14.3. Descadastro: todo e-mail de remarketing contém um link de descadastro. Ao utilizá-lo, o
                  Comprador deixa de receber comunicações de remarketing daquele Organizador, preferência esta
                  respeitada em todos os envios futuros.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  14.4. O Organizador é responsável pelo conteúdo (texto, imagem) enviado através da
                  ferramenta. A Premier Pass pode suspender o acesso à ferramenta em caso de uso indevido,
                  spam ou conteúdo enganoso. A cobrança pela ferramenta refere-se ao uso da tecnologia de
                  disparo, não ao acesso aos dados pessoais em si.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  15. Proteção de Dados Pessoais (LGPD)
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass trata dados pessoais (nome, e-mail, CPF, telefone e, quando aplicável, dados
                  técnicos de segurança da transação) em conformidade com a Lei Geral de Proteção de Dados
                  (Lei 13.709/2018), para as finalidades de: viabilizar a compra e emissão de ingressos,
                  validar a entrada em eventos, prevenir fraudes, cumprir obrigações legais e, quando
                  contratado pelo Organizador, envio de comunicações de remarketing conforme a Seção 14.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  O titular dos dados pode, a qualquer momento, solicitar confirmação de tratamento, acesso,
                  correção ou eliminação de seus dados pessoais, através do canal indicado na Seção 16. A
                  Plataforma utiliza cookies para funcionamento e melhoria da experiência, conforme aviso
                  exibido no primeiro acesso ao site.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  16. Conduta Proibida e Revenda de Ingressos
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  É vedado utilizar a Plataforma para revenda especulativa de ingressos com fins de lucro
                  (cambismo), criação de múltiplas contas para burlar limites de compra, uso de meios
                  automatizados (bots) para aquisição de ingressos, ou qualquer tentativa de fraude contra a
                  Plataforma, Organizadores ou outros usuários. A identificação dessas condutas pode resultar
                  em cancelamento de ingressos e suspensão da conta, sem prejuízo de outras medidas cabíveis.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">17. Propriedade Intelectual</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todo o conteúdo da Plataforma, incluindo logotipos, textos, layout e código, é propriedade da
                  Premier Pass e está protegido por leis de direitos autorais. Conteúdos enviados por
                  Organizadores (imagens, descrições de evento) permanecem de titularidade destes, que
                  declaram possuir os direitos necessários para publicá-los.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">18. Limitação de Responsabilidade</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass não se responsabiliza por: (i) a realização, qualidade ou conteúdo dos eventos
                  anunciados por Organizadores; (ii) atrasos ou falhas de entrega de e-mail por motivos alheios
                  ao seu controle; (iii) uso indevido do ingresso por terceiros decorrente de compartilhamento
                  do QR Code pelo próprio titular; (iv) instabilidades de conectividade do usuário no momento
                  da compra ou do acesso ao evento. Nos demais casos, a responsabilidade da Premier Pass está
                  limitada ao valor efetivamente pago pelo Comprador na transação em questão.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">19. Modificações</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Premier Pass reserva-se o direito de modificar estes termos a qualquer momento. Alterações
                  significativas serão comunicadas aos usuários através da Plataforma ou por e-mail.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">20. Lei Aplicável e Foro</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro do
                  domicílio do Comprador para dirimir eventuais controvérsias, conforme assegura o Código de
                  Defesa do Consumidor, sem prejuízo de outras disposições legais aplicáveis.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">21. Contato</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para dúvidas sobre estes termos, solicitações relacionadas a dados pessoais, ou qualquer
                  outro assunto, entre em contato através do e-mail:
                  <a href="mailto:legal@premierpass.com.br" className="text-primary hover:underline ml-1">
                    legal@premierpass.com.br
                  </a>
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  PremierPass — CNPJ {COMPANY_CNPJ}. Atendimento por WhatsApp: {WHATSAPP_DISPLAY}.
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

export default TermsOfService;
