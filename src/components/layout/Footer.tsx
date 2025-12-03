import { Link } from "react-router-dom";
import { Ticket, Instagram, Facebook, Twitter, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Event<span className="text-gradient">ix</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              A melhor plataforma para descobrir e comprar ingressos para os melhores eventos.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Explorar</h4>
            <ul className="space-y-2">
              <li><Link to="/eventos" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Todos os eventos</Link></li>
              <li><Link to="/categorias" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Categorias</Link></li>
              <li><Link to="/eventos?featured=true" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Em destaque</Link></li>
              <li><Link to="/eventos?soon=true" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Em breve</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Para organizadores</h4>
            <ul className="space-y-2">
              <li><Link to="/criar-evento" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Criar evento</Link></li>
              <li><Link to="/precos" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Preços</Link></li>
              <li><Link to="/recursos" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Recursos</Link></li>
              <li><Link to="/suporte" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Suporte</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Contato</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4" />
                contato@eventix.com
              </li>
            </ul>
            <div className="mt-6">
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/termos" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Termos de uso</Link></li>
                <li><Link to="/privacidade" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 Eventix. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
