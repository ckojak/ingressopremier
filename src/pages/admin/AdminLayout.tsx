import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  ShoppingCart,
  Users,
  QrCode,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Crown,
  Tag,
  BarChart3,
  Gift,
  UserCheck,
  ClipboardCheck,
  Home,
  Eye,
  Building2,
  Webhook,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import premierpassLogo from "@/assets/premierpass-logo.png";
import { getSiteConfig } from "@/lib/site-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppRole = Database["public"]["Enums"]["app_role"];

const AdminLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const siteConfig = getSiteConfig();

  // Menu items based on role
  const getMenuItems = () => {
    // Producer/Organizer menu - only their events and related features
    const producerItems = [
      { icon: LayoutDashboard, label: "Meu Painel", path: "/admin/produtor" },
      { icon: Calendar, label: "Meus Eventos", path: "/admin/eventos" },
      { icon: Ticket, label: "Ingressos", path: "/admin/ingressos" },
      { icon: ShoppingCart, label: "Vendas", path: "/admin/vendas" },
      { icon: Tag, label: "Cupons", path: "/admin/cupons" },
      { icon: Gift, label: "Cortesias", path: "/admin/cortesias" },
      { icon: QrCode, label: "Check-in", path: "/admin/checkin" },
      { icon: UserCheck, label: "Equipe Check-in", path: "/admin/equipe" },
    ];

    // Admin menu - full access including approvals
    if (userRole === "admin") {
      return [
        { icon: Crown, label: "Dashboard Admin", path: "/admin/super" },
        { icon: ClipboardCheck, label: "Aprovar Eventos", path: "/admin/aprovacoes" },
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
        { icon: Calendar, label: "Eventos", path: "/admin/eventos" },
        { icon: Ticket, label: "Ingressos", path: "/admin/ingressos" },
        { icon: ShoppingCart, label: "Vendas", path: "/admin/vendas" },
        { icon: Tag, label: "Cupons", path: "/admin/cupons" },
        { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
        { icon: Gift, label: "Cortesias", path: "/admin/cortesias" },
        { icon: QrCode, label: "Check-in", path: "/admin/checkin" },
        { icon: UserCheck, label: "Equipe Check-in", path: "/admin/equipe" },
        { icon: Users, label: "Usuários", path: "/admin/usuarios" },
        { icon: Webhook, label: "Webhooks", path: "/admin/webhooks" },
        { icon: Settings, label: "Pagamentos", path: "/admin/pagamentos" },
      ];
    }

    return producerItems;
  };

  // Single effect to handle auth and role checking
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (sessionError) {
          console.warn("Session error:", sessionError.message);
        }

        if (!currentSession?.user) {
          setIsInitialized(true);
          setHasAccess(false);
          navigate("/auth");
          return;
        }

        setSession(currentSession);
        setUser(currentSession.user);

        // Fetch user roles (user may have multiple) - with error handling
        const { data: rolesData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentSession.user.id);

        if (!isMounted) return;

        if (roleError) {
          console.warn("Error fetching role:", roleError.message);
          // Don't show error to user, just redirect to home
          setHasAccess(false);
          setIsInitialized(true);
          navigate("/");
          return;
        }

        // Get the highest priority role (admin > organizer > user)
        const roleList = rolesData?.map(r => r.role) || [];
        let primaryRole: AppRole | null = null;
        
        if (roleList.includes("admin")) {
          primaryRole = "admin";
        } else if (roleList.includes("organizer")) {
          primaryRole = "organizer";
        } else if (roleList.length > 0) {
          primaryRole = roleList[0] as AppRole;
        }

        const roleData = primaryRole ? { role: primaryRole } : null;

        const role = roleData?.role;
        setUserRole(role ?? null);

        if (!role || !["admin", "organizer"].includes(role)) {
          // Silently redirect without error message
          setHasAccess(false);
          setIsInitialized(true);
          navigate("/painel");
          return;
        }

        setHasAccess(true);
        setIsInitialized(true);
      } catch (error) {
        console.warn("Auth initialization error:", error);
        if (isMounted) {
          setHasAccess(false);
          setIsInitialized(true);
          navigate("/");
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        
        if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
          setUserRole(null);
          setHasAccess(false);
          navigate("/");
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // View switcher for admin to see different dashboards
  const ViewSwitcher = () => {
    if (userRole !== "admin") return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            {sidebarOpen && "Trocar Visão"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Visualizar como</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/admin/super")}>
            <Crown className="w-4 h-4 mr-2" />
            Admin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/produtor")}>
            <Building2 className="w-4 h-4 mr-2" />
            Produtor
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/painel")}>
            <Users className="w-4 h-4 mr-2" />
            Cliente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={premierpassLogo} alt="PremierPass" className="w-16 h-16 rounded-xl animate-pulse" />
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!hasAccess || !user || !userRole) {
    return null;
  }

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border bg-gradient-to-r from-primary/10 to-accent/10">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-3">
              <img src={premierpassLogo} alt="PremierPass" className="w-10 h-10 rounded-xl" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-sidebar-foreground">
                  Premier<span className="text-gradient">Pass</span>
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {userRole === "admin" ? "Admin" : "Produtor"}
                </span>
              </div>
            </Link>
          )}
          {!sidebarOpen && (
            <Link to="/" className="mx-auto">
              <img src={premierpassLogo} alt="PremierPass" className="w-10 h-10 rounded-xl" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-primary/20"
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Role Badge and View Switcher */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-sidebar-border bg-secondary/30 space-y-2">
            <span className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5",
              userRole === "admin" 
                ? "bg-gradient-to-r from-primary/30 to-accent/30 text-primary border border-primary/30" 
                : "bg-primary/20 text-primary"
            )}>
              {userRole === "admin" && <Crown className="w-3 h-3" />}
              {userRole === "admin" ? "Administrador" : "Organizador"}
            </span>
            <ViewSwitcher />
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-sm")} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Quick Links */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link to="/">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-secondary",
                !sidebarOpen && "justify-center"
              )}
            >
              <Home className="w-5 h-5" />
              {sidebarOpen && <span>Ir para o Site</span>}
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10">
          <Link to="/" className="flex items-center gap-3">
            <img src={premierpassLogo} alt="PremierPass" className="w-10 h-10 rounded-xl" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">
                Premier<span className="text-gradient">Pass</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {userRole === "admin" ? "Admin" : "Produtor"}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {userRole === "admin" && <ViewSwitcher />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-sidebar-foreground hover:bg-primary/20"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="p-4 space-y-1 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-sm max-h-[70vh] overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-sidebar-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-4 space-y-2 border-t border-sidebar-border mt-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground">
                  <Home className="w-5 h-5" />
                  <span>Ir para o Site</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </Button>
            </div>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto bg-gradient-to-br from-background via-background to-secondary/20">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
