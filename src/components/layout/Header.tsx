import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Ticket, User, LogOut, LayoutDashboard, ShoppingCart, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import premierpassLogo from "@/assets/premierpass-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserRole(session.user.id), 0);
      } else {
        setUserRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
    });

    const updateCartCount = () => {
      const cartData = JSON.parse(localStorage.getItem("cart") || '{"items":[]}');
      const items = Array.isArray(cartData) ? cartData : (cartData.items || []);
      const count = items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    setUserRole(data?.role || "user");
  };

  const handleLogout = async () => {
    setUser(null);
    setUserRole(null);
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      await supabase.auth.signOut({ scope: 'local' });
    }
    
    toast.success("Você saiu da sua conta");
    navigate("/");
  };

  const isAdmin = userRole === "admin" || userRole === "organizer";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={premierpassLogo} 
                alt="PremierPass" 
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl md:text-2xl font-display font-bold text-foreground tracking-tight">
                Premier<span className="text-gradient">Pass</span>
              </span>
              <span className="block text-[10px] md:text-xs tracking-widest text-muted-foreground uppercase">
                Ingressos Premium
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/eventos" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium tracking-wide">
              Eventos
            </Link>
            {user && (
              <Link to="/meus-ingressos" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium tracking-wide">
                Meus Ingressos
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium tracking-wide">
                Admin
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/carrinho" className="relative">
              <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-primary/10">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/10">
                    <User className="w-4 h-4" />
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem asChild>
                    <Link to="/perfil" className="cursor-pointer">
                      <UserCircle className="w-4 h-4 mr-2" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/meus-ingressos" className="cursor-pointer">
                      <Ticket className="w-4 h-4 mr-2" />
                      Meus Ingressos
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button className="gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
                  Entrar
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/carrinho" className="relative">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hover:bg-primary/10"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card/95 backdrop-blur-xl border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <Link
                to="/eventos"
                className="text-muted-foreground hover:text-primary transition-colors py-2 text-sm font-medium tracking-wide"
                onClick={() => setIsMenuOpen(false)}
              >
                Eventos
              </Link>
              {user && (
                <>
                  <Link
                    to="/perfil"
                    className="text-muted-foreground hover:text-primary transition-colors py-2 text-sm font-medium tracking-wide"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Meu Perfil
                  </Link>
                  <Link
                    to="/meus-ingressos"
                    className="text-muted-foreground hover:text-primary transition-colors py-2 text-sm font-medium tracking-wide"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Meus Ingressos
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-muted-foreground hover:text-primary transition-colors py-2 text-sm font-medium tracking-wide"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <Button variant="outline" className="w-full border-primary/30 hover:border-primary" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full gradient-primary text-primary-foreground font-semibold">Entrar</Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;