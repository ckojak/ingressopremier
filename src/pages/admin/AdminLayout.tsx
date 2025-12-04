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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  // Menu items based on role
  const getMenuItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: Calendar, label: "Eventos", path: "/admin/eventos" },
      { icon: Ticket, label: "Ingressos", path: "/admin/ingressos" },
      { icon: ShoppingCart, label: "Vendas", path: "/admin/vendas" },
      { icon: Tag, label: "Cupons", path: "/admin/cupons" },
      { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
      { icon: Gift, label: "Cortesias", path: "/admin/cortesias" },
      { icon: QrCode, label: "Check-in", path: "/admin/checkin" },
      { icon: UserCheck, label: "Equipe Check-in", path: "/admin/equipe" },
    ];

    if (userRole === "admin") {
      return [
        { icon: Crown, label: "Dashboard Admin", path: "/admin/super" },
        ...baseItems,
        { icon: Users, label: "Usuários", path: "/admin/usuarios" },
      ];
    }

    return baseItems;
  };

  // Single effect to handle auth and role checking
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (!currentSession?.user) {
          setIsInitialized(true);
          setHasAccess(false);
          navigate("/auth");
          return;
        }

        setSession(currentSession);
        setUser(currentSession.user);

        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentSession.user.id)
          .maybeSingle();

        if (!isMounted) return;

        console.log("Role data:", roleData, "Error:", roleError);

        if (roleError) {
          console.error("Error fetching role:", roleError);
          toast.error("Erro ao verificar permissões.");
          setHasAccess(false);
          setIsInitialized(true);
          navigate("/");
          return;
        }

        const role = roleData?.role;
        setUserRole(role ?? null);

        if (!role || !["admin", "organizer"].includes(role)) {
          toast.error("Você não tem permissão para acessar o painel administrativo.");
          setHasAccess(false);
          setIsInitialized(true);
          navigate("/");
          return;
        }

        setHasAccess(true);
        setIsInitialized(true);
      } catch (error) {
        console.error("Auth initialization error:", error);
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

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
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
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">
                Event<span className="text-gradient">ix</span>
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground"
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Role Badge */}
        {sidebarOpen && (
          <div className="px-4 py-2 border-b border-sidebar-border">
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              userRole === "admin" 
                ? "bg-yellow-500/20 text-yellow-400" 
                : "bg-primary/20 text-primary"
            )}>
              {userRole === "admin" ? "Administrador" : "Organizador"}
            </span>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
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
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">
              Event<span className="text-gradient">ix</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-sidebar-foreground"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="p-4 space-y-2 border-t border-sidebar-border">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
