import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Ticket, User, LogOut, LayoutDashboard, ShoppingCart, UserCircle, Building2, Users, Shield, Crown } from "lucide-react";
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import premierpassLogo from "@/assets/premierpass-logo.png";
import ThemeToggle from "@/components/ThemeToggle";
import { ADMIN_EMAILS } from "@/lib/constants";

// Admin emails that get automatic admin role

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id, session.user.email);
      } else {
        setUserRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id, session.user.email);
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

  const fetchUserRole = async (userId: string, email?: string | null) => {
    // Fetch all roles for the user (they may have multiple)
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error fetching roles:", error);
      setUserRole("user");
      return;
    }

    // Get the highest priority role (admin > organizer > user)
    const roleList = roles?.map(r => r.role) || [];
    let primaryRole = "user";
    
    if (roleList.includes("admin")) {
      primaryRole = "admin";
    } else if (roleList.includes("organizer")) {
      primaryRole = "organizer";
    } else if (roleList.length > 0) {
      primaryRole = roleList[0];
    }
    
    // If no role and is admin email, create admin role
    if (roleList.length === 0 && email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
      await supabase.from("user_roles").insert([{ 
        user_id: userId, 
        role: "admin" as any 
      }]);
      setUserRole("admin");
      return;
    }
    
    setUserRole(primaryRole);
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

  // Get role badge info with animation config
  const getRoleBadge = () => {
    if (isAdmin) {
      return { 
        label: "Admin", 
        variant: "destructive" as const, 
        icon: Shield,
        bgClass: "bg-gradient-to-r from-red-500 to-orange-500",
        textClass: "text-white"
      };
    }
    if (isProducer) {
      return { 
        label: "Produtor", 
        variant: "default" as const, 
        icon: Crown,
        bgClass: "bg-gradient-to-r from-primary to-accent",
        textClass: "text-primary-foreground"
      };
    }
    return { 
      label: "Cliente", 
      variant: "secondary" as const, 
      icon: Users,
      bgClass: "bg-secondary",
      textClass: "text-secondary-foreground"
    };
  };

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  // Animated Badge Component
  const AnimatedBadge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={premierpassLogo} 
                alt="PremierPass Ingressos" 
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
            <ThemeToggle />
            <Link to="/carrinho" className="relative">
              <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center font-bold shadow-premium"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </Button>
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 rounded-xl font-semibold">
                    <User className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </span>
                    <AnimatedBadge>
                      <Badge className={`ml-1 text-[10px] px-1.5 py-0 ${roleBadge.bgClass} ${roleBadge.textClass} border-0`}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {roleBadge.label}
                      </Badge>
                    </AnimatedBadge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 glass-strong border-border/40 rounded-xl">
                  {/* User Info Header */}
                  <DropdownMenuLabel className="flex items-center gap-2 pb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.user_metadata?.full_name || "Usuário"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <AnimatedBadge>
                      <Badge className={`text-[10px] ${roleBadge.bgClass} ${roleBadge.textClass} border-0`}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {roleBadge.label}
                      </Badge>
                    </AnimatedBadge>
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSeparator />
                  
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
                  
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Meus Painéis
                  </DropdownMenuLabel>
                  
                  {/* Client Dashboard - available for all logged users */}
                  <DropdownMenuItem asChild>
                    <Link to="/painel" className="cursor-pointer flex items-center justify-between">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Painel do Cliente
                      </span>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Badge variant="secondary" className="text-[9px] px-1.5">Cliente</Badge>
                      </motion.div>
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Producer Dashboard - only for producers and admins */}
                  {(isProducer || isAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/produtor" className="cursor-pointer flex items-center justify-between">
                        <span className="flex items-center">
                          <Building2 className="w-4 h-4 mr-2" />
                          Painel do Produtor
                        </span>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Badge className="text-[9px] px-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">Produtor</Badge>
                        </motion.div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Admin Dashboard - only for admins */}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/super" className="cursor-pointer flex items-center justify-between">
                        <span className="flex items-center">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Painel Admin
                        </span>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Badge className="text-[9px] px-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">Admin</Badge>
                        </motion.div>
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
            <ThemeToggle />
            <Link to="/carrinho" className="relative">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-xl transition-all">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center font-bold shadow-premium"
                  >
                    {cartCount}
                  </motion.span>
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
              {/* User Info with Animated Badge - Mobile */}
              {user && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between pb-4 border-b border-border/30"
                >
                  <div>
                    <p className="font-semibold text-sm">{user.user_metadata?.full_name || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <AnimatedBadge>
                    <Badge className={`text-xs ${roleBadge.bgClass} ${roleBadge.textClass} border-0`}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {roleBadge.label}
                    </Badge>
                  </AnimatedBadge>
                </motion.div>
              )}
              
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
                  <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Link
                      to="/painel"
                      className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30 flex items-center justify-between"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Painel do Cliente
                      </span>
                      <Badge variant="secondary" className="text-[10px]">Cliente</Badge>
                    </Link>
                  </motion.div>
                  
                  {/* Producer Dashboard */}
                  {(isProducer || isAdmin) && (
                    <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}>
                      <Link
                        to="/admin/produtor"
                        className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30 flex items-center justify-between"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Painel do Produtor
                        </span>
                        <Badge className="text-[10px] bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">Produtor</Badge>
                      </Link>
                    </motion.div>
                  )}
                  
                  {/* Admin Dashboard */}
                  {isAdmin && (
                    <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}>
                      <Link
                        to="/admin/super"
                        className="text-muted-foreground hover:text-primary transition-colors py-3 text-base font-semibold tracking-wide border-b border-border/30 flex items-center justify-between"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="flex items-center gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          Painel Admin
                        </span>
                        <Badge className="text-[10px] bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">Admin</Badge>
                      </Link>
                    </motion.div>
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