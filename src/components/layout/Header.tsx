import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Ticket, User, LogOut, LayoutDashboard, ShoppingCart, UserCircle, Building2, Users } from "lucide-react";
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

  const isAdmin = userRole === "admin";
  const isProducer = userRole === "organizer";
  const isClient = userRole === "user" || userRole === "client";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={premierpassLogo} 
                alt="PremierPass" 
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover transition-all duration-300 group-hover:scale-110 shadow-subtle"
              />
              <div className="absolute inset-0 rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-lg" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl md:text-2xl font-display font-bold text-foreground tracking-tight">
                Premier<span className="text-gradient">Pass</span>
              </span>
              <span className="block text-[10px] md:text-xs tracking-[0.15em] text-muted-foreground uppercase font-medium">
                Ingressos Premium
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/eventos" className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm font-semibold tracking-wide relative group">
              Eventos
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
            </Link>
            {user && (
              <Link to="/meus-ingressos" className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm font-semibold tracking-wide relative group">
                Meus Ingressos
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300"></span>
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/carrinho" className="relative">
              <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center font-bold shadow-premium animate-pulse-glow">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 rounded-xl font-semibold">
                    <User className="w-4 h-4" />
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-strong border-border/40 rounded-xl">
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
                  
                  <DropdownMenuSeparator />
                  
                  {/* Client Dashboard - available for all logged users */}
                  <DropdownMenuItem asChild>
                    <Link to="/painel" className="cursor-pointer">
                      <Users className="w-4 h-4 mr-2" />
                      Painel do Cliente
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Producer Dashboard - only for producers and admins */}
                  {(isProducer || isAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/produtor" className="cursor-pointer">
                        <Building2 className="w-4 h-4 mr-2" />
                        Painel do Produtor
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Admin Dashboard - only for admins */}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/super" className="cursor-pointer">
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
                <Button className="gradient-primary text-primary-foreground hover:opacity-90 font-semibold rounded-xl shadow-subtle hover:shadow-premium transition-all duration-300 hover-lift">
                  Entrar
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/carrinho" className="relative">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-xl transition-all">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center font-bold shadow-premium">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hover:bg-primary/10 rounded-xl transition-all"
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
            className="md:hidden glass-strong border-t border-border/40"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <Link
                to="/eventos"
                className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30"
                onClick={() => setIsMenuOpen(false)}
              >
                Eventos
              </Link>
              {user && (
                <>
                  <Link
                    to="/perfil"
                    className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Meu Perfil
                  </Link>
                  <Link
                    to="/meus-ingressos"
                    className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Meus Ingressos
                  </Link>
                  
                  {/* Dashboards Section */}
                  <div className="py-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Meus Painéis</span>
                  </div>
                  
                  {/* Client Dashboard - available for all */}
                  <Link
                    to="/painel"
                    className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30 flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    Painel do Cliente
                  </Link>
                  
                  {/* Producer Dashboard */}
                  {(isProducer || isAdmin) && (
                    <Link
                      to="/admin/produtor"
                      className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30 flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Building2 className="w-4 h-4" />
                      Painel do Produtor
                    </Link>
                  )}
                  
                  {/* Admin Dashboard */}
                  {isAdmin && (
                    <Link
                      to="/admin/super"
                      className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30 flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Painel Admin
                    </Link>
                  )}
                </>
              )}
              <div className="flex flex-col gap-3 pt-4">
                {user ? (
                  <Button variant="outline" className="w-full border-border/40 hover:border-primary/40 rounded-xl font-semibold" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full gradient-primary text-primary-foreground font-semibold rounded-xl shadow-subtle hover:shadow-premium transition-all">Entrar</Button>
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