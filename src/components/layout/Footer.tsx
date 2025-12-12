import { Link } from "react-router-dom";
import { Instagram, MapPin, Phone } from "lucide-react";
import quintalLogo from "@/assets/quintal-logo.png";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img 
                src={quintalLogo} 
                alt="Quintal Barra" 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <span className="text-2xl font-display font-semibold text-foreground tracking-wider">
                  QUINTAL
                </span>
                <span className="block text-xs tracking-[0.3em] text-primary uppercase">
                  Gastro Music Bar
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              Onde o Rio se encontra. Alta gastronomia, música na medida, drinks e aquela vibe boa.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/quintalbarra/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-display text-lg font-semibold text-foreground mb-4 tracking-wide">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Barra da Tijuca • Olegário Maciel, 402</span>
              </li>
              <li>
                <a 
                  href="https://wa.me/5521982031368" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground text-sm hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  +55 21 98203-1368
                </a>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-lg font-semibold text-foreground mb-4 tracking-wide">Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/eventos" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Programação
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
              <li>
                <Link to="/suporte" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  Suporte
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <p className="text-muted-foreground text-sm text-center">
            © {new Date().getFullYear()} Quintal Barra - Gastro Music Bar. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
