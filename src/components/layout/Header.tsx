import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Menu, X, Ticket } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Event<span className="text-gradient">ix</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/eventos" className="text-muted-foreground hover:text-foreground transition-colors">
              Eventos
            </Link>
            <Link to="/categorias" className="text-muted-foreground hover:text-foreground transition-colors">
              Categorias
            </Link>
            <Link to="/sobre" className="text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <Link to="/auth">
              <Button variant="outline">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Criar conta</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <Link
                to="/eventos"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Eventos
              </Link>
              <Link
                to="/categorias"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Categorias
              </Link>
              <Link
                to="/sobre"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Sobre
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Criar conta</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
