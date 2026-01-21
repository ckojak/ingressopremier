import { Link } from "react-router-dom";
import { Instagram, Mail, Shield, Ticket } from "lucide-react";
import premierpassLogo from "@/assets/premierpass-logo.png";

const Footer = () => {
  return (
    <footer className="glass-strong border-t border-border/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <img 
                src={premierpassLogo} 
                alt="PremierPass" 
                className="w-14 h-14 rounded-xl object-cover transition-all duration-300 group-hover:scale-110 shadow-subtle"
              />
              <div>
                <span className="text-2xl font-display font-bold text-foreground">
                  Premier<span className="text-gradient">Pass</span>
                </span>
                <span className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-medium">
                  Ingressos Premium
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-xs leading-relaxed">
              Sua porta de entrada para os melhores eventos. Compre ingressos com segurança e praticidade.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/premierpass" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl glass-premium flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 hover-lift group"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a 
                href="mailto:contato@premierpass.com.br" 
                className="w-11 h-11 rounded-xl glass-premium flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 hover-lift group"
                aria-label="Email"
              >
                <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-xl font-bold text-foreground mb-6">Links Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/eventos" className="text-muted-foreground hover:text-primary text-sm md:text-base transition-all duration-200 flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-lg glass-premium flex items-center justify-center group-hover:bg-primary/10 transition-all">
                    <Ticket className="w-4 h-4 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-medium">Eventos</span>
                </Link>
              </li>
              <li>
                <Link to="/suporte" className="text-muted-foreground hover:text-primary text-sm md:text-base transition-all duration-200 inline-block font-medium group">
                  Suporte
                  <span className="block h-0.5 bg-gradient-primary w-0 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-primary text-sm md:text-base transition-all duration-200 inline-block font-medium group">
                  Termos de Serviço
                  <span className="block h-0.5 bg-gradient-primary w-0 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-primary text-sm md:text-base transition-all duration-200 inline-block font-medium group">
                  Política de Privacidade
                  <span className="block h-0.5 bg-gradient-primary w-0 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="font-display text-xl font-bold text-foreground mb-6">Segurança</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground text-sm md:text-base group cursor-default">
                <div className="w-10 h-10 rounded-xl glass-premium flex items-center justify-center group-hover:bg-primary/10 transition-all">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium group-hover:text-foreground transition-colors">Pagamento 100% Seguro</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm md:text-base group cursor-default">
                <div className="w-10 h-10 rounded-xl glass-premium flex items-center justify-center group-hover:bg-accent/10 transition-all">
                  <Ticket className="w-5 h-5 text-accent" />
                </div>
                <span className="font-medium group-hover:text-foreground transition-colors">Ingressos Digitais Verificados</span>
              </div>
              <div className="glass-premium p-4 rounded-xl mt-5">
                <p className="text-muted-foreground/80 text-xs md:text-sm leading-relaxed">
                  Todas as transações são protegidas com criptografia de ponta a ponta.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 mt-12 pt-10 space-y-2">
          <p className="text-muted-foreground/70 text-sm md:text-base text-center font-medium">
            © {new Date().getFullYear()} PremierPass. Todos os direitos reservados.
          </p>
          <p className="text-muted-foreground/40 text-xs text-center">
            feito por KOJAK SOLUÇÕES
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;