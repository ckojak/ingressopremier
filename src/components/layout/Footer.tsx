import { Link } from "react-router-dom";
import { Instagram, Mail, Shield, Ticket } from "lucide-react";
import premierpassLogo from "@/assets/premierpass-logo.png";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <img 
                src={premierpassLogo} 
                alt="PremierPass" 
                className="w-12 h-12 rounded-xl object-cover transition-transform group-hover:scale-105"
              />
              <div>
                <span className="text-2xl font-display font-bold text-foreground">
                  Premier<span className="text-gradient">Pass</span>
                </span>
                <span className="block text-xs tracking-widest text-muted-foreground uppercase">
                  Ingressos Premium
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              Sua porta de entrada para os melhores eventos. Compre ingressos com segurança e praticidade.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/premierpass" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="mailto:contato@premierpass.com.br" 
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-lg font-bold text-foreground mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/eventos" className="text-muted-foreground hover:text-primary text-sm transition-colors flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  Eventos
                </Link>
              </li>
              <li>
                <Link to="/suporte" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Suporte
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="font-display text-lg font-bold text-foreground mb-4">Segurança</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Shield className="w-5 h-5 text-primary" />
                <span>Pagamento 100% Seguro</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Ticket className="w-5 h-5 text-accent" />
                <span>Ingressos Digitais Verificados</span>
              </div>
              <p className="text-muted-foreground/70 text-xs mt-4">
                Todas as transações são protegidas com criptografia de ponta a ponta.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8">
          <p className="text-muted-foreground text-sm text-center">
            © {new Date().getFullYear()} PremierPass. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;