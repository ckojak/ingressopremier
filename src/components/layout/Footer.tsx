import { Link } from "react-router-dom";
import { Ticket, Instagram, Facebook, Twitter, Mail, Linkedin, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Premier<span className="text-gradient">Pass</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              Sua entrada para experiências únicas. A melhor plataforma para descobrir e comprar ingressos para os melhores eventos do Brasil.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Explorar */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Explorar</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/eventos" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Todos os eventos
                </Link>
              </li>
              <li>
                <Link to="/eventos?categoria=show" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Shows
                </Link>
              </li>
              <li>
                <Link to="/eventos?categoria=festival" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Festivais
                </Link>
              </li>
              <li>
                <Link to="/eventos?categoria=teatro" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Teatro
                </Link>
              </li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Institucional</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/sobre" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Sobre nós
                </Link>
              </li>
              <li>
                <Link to="/suporte" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Fale com a Premier Pass
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:contato@premierpass.com.br" 
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  contato@premierpass.com.br
                </a>
              </li>
            </ul>
          </div>

          {/* Termos */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Termos</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/meia-entrada" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Lei da Meia-Entrada
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Termos de Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Premier Pass. Todos os direitos reservados.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-muted-foreground">
              <span>CNPJ: 51.963.177/0001-24</span>
              <span className="hidden md:inline">|</span>
              <a href="tel:+5521979934676" className="hover:text-foreground transition-colors">
                (21) 97993-4676
              </a>
              <span className="hidden md:inline">|</span>
              <span>Rio de Janeiro, RJ - Brasil</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
