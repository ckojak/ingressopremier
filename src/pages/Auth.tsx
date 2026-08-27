import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowLeft, Check, X, Eye, EyeOff, Phone, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import premierpassLogo from "@/assets/premierpass-logo.png";
import { useSiteContext } from "@/hooks/useSiteContext";
import UserTypeSelector from "@/components/UserTypeSelector";

interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isValidCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(digits.charAt(10));
};

const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
};

// List of admin emails that should be auto-assigned admin role
const ADMIN_EMAILS = ["bmw.reta@hotmail.com"];

// Preserved post-login destination (used by the OAuth consent flow)
const getNextPath = (): string | null => {
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw) return null;
  // Only allow same-origin relative paths
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // User type selector - shown during REGISTRATION
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<{
    email: string;
    password: string;
    fullName: string;
    cpf: string;
    phone: string;
  } | null>(null);
  const [userTypeSelectorLoading, setUserTypeSelectorLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const siteConfig = useSiteContext();

  const from = (location.state as any)?.from || siteConfig.homeRedirect;

  const passwordStrength: PasswordStrength = useMemo(() => ({
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }), [password]);

  const isPasswordStrong = useMemo(() => {
    return Object.values(passwordStrength).every(Boolean);
  }, [passwordStrength]);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const isClientFieldsValid = useMemo(() => {
    if (isLogin) return true;
    return isValidCPF(cpf) && isValidPhone(phone);
  }, [isLogin, cpf, phone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Helper function to determine redirect destination based on role
  const getRedirectDestination = (role: string | null | undefined): string => {
    const next = getNextPath();
    if (next) return next;
    if (role === "admin") {
      return "/admin/super"; // Admin goes to SuperAdmin Dashboard
    }
    if (role === "organizer") {
      return "/admin/produtor"; // Producer goes to Producer Dashboard
    }
    return "/painel"; // Client goes to Client Dashboard
  };

  // Handle user type selection during REGISTRATION
  const handleUserTypeSelect = async (userType: "client" | "producer") => {
    if (!pendingRegistrationData) return;
    
    setUserTypeSelectorLoading(true);
    try {
      // Check if user email is in admin list
      const isAdminEmail = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(pendingRegistrationData.email.toLowerCase());
      
      // Determine role: admin if in list, otherwise based on selection
      let role: string;
      if (isAdminEmail) {
        role = "admin";
      } else {
        role = userType === "producer" ? "organizer" : "user";
      }

      // Now create the account with the selected type
      const { data, error } = await supabase.auth.signUp({
        email: pendingRegistrationData.email,
        password: pendingRegistrationData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth${getNextPath() ? `?next=${encodeURIComponent(getNextPath()!)}` : ""}`,
          data: {
            full_name: pendingRegistrationData.fullName,
            user_type: userType,
            cpf: pendingRegistrationData.cpf.replace(/\D/g, ""),
            phone: pendingRegistrationData.phone.replace(/\D/g, ""),
            selected_role: role,
          },
        },
      });

      if (error) throw error;

      // If user was created and signed in (email confirmation disabled)
      if (data.user && data.session) {
        // Create the role in user_roles table
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: data.user.id, role: role as any }]);

        if (roleError) {
          console.error("Error creating role:", roleError);
        }

        setShowUserTypeSelector(false);
        setPendingRegistrationData(null);
        
        // Redirect based on role
        const destination = getRedirectDestination(role);
        navigate(destination);
        
        toast({
          title: isAdminEmail ? "Bem-vindo, Administrador!" : "Cadastro realizado!",
          description: isAdminEmail 
            ? "Você tem acesso total ao sistema."
            : userType === "producer" 
              ? "Você agora pode criar e gerenciar eventos."
              : "Explore os melhores eventos!",
        });
      } else {
        // Email confirmation is enabled
        setShowUserTypeSelector(false);
        setPendingRegistrationData(null);
        setIsLogin(true);
        
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Verifique seu email para confirmar a conta e depois faça login.",
        });
      }
    } catch (error: any) {
      console.error("Error during registration:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar sua conta.",
        variant: "destructive",
      });
    } finally {
      setUserTypeSelectorLoading(false);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;
    
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && isMounted) {
        // User is logged in, check their role and redirect
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const destination = getRedirectDestination(roleData?.role);
        navigate(destination);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if user has a role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // If no role exists, check if this was from OAuth (Google)
        if (!roleData?.role) {
          // For OAuth users without role, we need to handle this
          // Check if user is admin email
          const isAdminEmail = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(session.user.email?.toLowerCase() || "");
          
          if (isAdminEmail) {
            // Auto-create admin role
            await supabase.from("user_roles").insert([{ 
              user_id: session.user.id, 
              role: "admin" as any 
            }]);
            navigate(getNextPath() ?? "/admin/super");
          } else {
            // For OAuth users, default to client role
            await supabase.from("user_roles").insert([{ 
              user_id: session.user.id, 
              role: "user" as any 
            }]);
            navigate(getNextPath() ?? "/painel");
          }
          return;
        }

        // Redirect based on role
        const destination = getRedirectDestination(roleData?.role);
        navigate(destination);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth${getNextPath() ? `?next=${encodeURIComponent(getNextPath()!)}` : ""}`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      // REGISTRATION - Validate fields first
      if (!fullName.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, insira seu nome completo.",
          variant: "destructive",
        });
        return;
      }

      if (!isValidCPF(cpf)) {
        toast({
          title: "CPF inválido",
          description: "Por favor, insira um CPF válido.",
          variant: "destructive",
        });
        return;
      }

      // Impede criar uma segunda conta com o mesmo CPF de outra já existente
      const { data: cpfAvailable, error: cpfCheckError } = await (supabase as any).rpc("is_cpf_available", {
        p_cpf: cpf,
      });
      if (!cpfCheckError && cpfAvailable === false) {
        toast({
          title: "CPF já cadastrado",
          description: "Já existe uma conta com este CPF. Faça login em vez de criar uma nova conta.",
          variant: "destructive",
        });
        return;
      }
      if (!isValidPhone(phone)) {
        toast({
          title: "Telefone inválido",
          description: "Por favor, insira um telefone válido.",
          variant: "destructive",
        });
        return;
      }

      if (!isPasswordStrong) {
        toast({
          title: "Senha fraca",
          description: "Sua senha deve atender a todos os requisitos de segurança.",
          variant: "destructive",
        });
        return;
      }
      
      if (!passwordsMatch) {
        toast({
          title: "Senhas não conferem",
          description: "A confirmação de senha deve ser igual à senha.",
          variant: "destructive",
        });
        return;
      }

      if (!acceptedTerms) {
        toast({
          title: "Aceite os Termos",
          description: "Você precisa aceitar os Termos de Serviço e a Política de Privacidade para continuar.",
          variant: "destructive",
        });
        return;
      }

      // All validations passed - show user type selector
      setPendingRegistrationData({
        email,
        password,
        fullName,
        cpf,
        phone,
      });
      setShowUserTypeSelector(true);
      return;
    }
    
    // LOGIN
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Get ALL user roles for redirect (user may have multiple)
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const roleList = rolesData?.map(r => r.role) || [];
      
      // Get the highest priority role (admin > organizer > user)
      let primaryRole: string | null = null;
      if (roleList.includes("admin")) {
        primaryRole = "admin";
      } else if (roleList.includes("organizer")) {
        primaryRole = "organizer";
      } else if (roleList.length > 0) {
        primaryRole = roleList[0];
      }

      // Check if admin email but no role
      if (!primaryRole) {
        const isAdminEmail = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
        if (isAdminEmail) {
          await supabase.from("user_roles").insert([{ 
            user_id: data.user.id, 
            role: "admin" as any 
          }]);
          navigate(getNextPath() ?? "/admin/super");
          toast({
            title: "Bem-vindo, Administrador!",
            description: "Você tem acesso total ao sistema.",
          });
          return;
        }
        // No role, default to client
        await supabase.from("user_roles").insert([{ 
          user_id: data.user.id, 
          role: "user" as any 
        }]);
        navigate(getNextPath() ?? "/painel");
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta.",
        });
      } else {
        const destination = getRedirectDestination(primaryRole);
        navigate(destination);
        
        // Show appropriate welcome message based on role
        if (primaryRole === "admin") {
          toast({
            title: "Bem-vindo, Administrador!",
            description: "Você tem acesso total ao sistema.",
          });
        } else if (primaryRole === "organizer") {
          toast({
            title: "Login realizado com sucesso!",
            description: "Bem-vindo ao painel de produtor.",
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Bem-vindo de volta.",
          });
        }
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes("User already registered")) {
        message = "Este email já está cadastrado. Tente fazer login.";
      } else if (error.message.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-green-500" : "text-muted-foreground"}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{text}</span>
    </div>
  );

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.img
            src={premierpassLogo}
            alt="PremierPass"
            className="w-20 h-20 rounded-2xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <span className="text-2xl font-display font-bold text-foreground">
              Premier<span className="text-gradient">Pass</span>
            </span>
            <span className="block text-xs tracking-widest text-muted-foreground uppercase">
              Ingressos Premium
            </span>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 150 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="h-0.5 bg-primary rounded-full"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <UserTypeSelector
        open={showUserTypeSelector}
        onSelect={handleUserTypeSelect}
        loading={userTypeSelectorLoading}
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>

        <div className="glass rounded-2xl p-8 border border-border/50">
          <div className="flex items-center gap-3 justify-center mb-8">
            <img src={premierpassLogo} alt="PremierPass" className="w-14 h-14 rounded-xl" />
            <div className="text-center">
              <span className="text-2xl font-display font-bold text-foreground">
                Premier<span className="text-gradient">Pass</span>
              </span>
              <span className="block text-xs tracking-widest text-muted-foreground uppercase">
                Ingressos Premium
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-display font-semibold text-foreground text-center mb-2">
            {isLogin ? "Bem-vindo de volta!" : "Crie sua conta"}
          </h1>
          <p className="text-muted-foreground text-center mb-6 text-sm">
            {isLogin
              ? "Entre com suas credenciais para continuar"
              : "Preencha os dados para se cadastrar"}
          </p>

          {isLogin && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 border-border hover:border-primary"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </Button>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-xs text-muted-foreground">
                  ou continue com email
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Seu nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 h-12"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        className="pl-10 h-12"
                        required={!isLogin}
                      />
                    </div>
                    {cpf && !isValidCPF(cpf) && (
                      <p className="text-xs text-destructive">CPF inválido</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="pl-10 h-12"
                        required={!isLogin}
                      />
                    </div>
                    {phone && !isValidPhone(phone) && (
                      <p className="text-xs text-destructive">Telefone inválido</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {!isLogin && password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1 pt-2"
                >
                  <PasswordRequirement met={passwordStrength.hasMinLength} text="Mínimo 8 caracteres" />
                  <PasswordRequirement met={passwordStrength.hasUppercase} text="Uma letra maiúscula" />
                  <PasswordRequirement met={passwordStrength.hasLowercase} text="Uma letra minúscula" />
                  <PasswordRequirement met={passwordStrength.hasNumber} text="Um número" />
                  <PasswordRequirement met={passwordStrength.hasSpecial} text="Um caractere especial" />
                </motion.div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required={!isLogin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-2 text-xs ${passwordsMatch ? "text-green-500" : "text-destructive"}`}>
                      {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{passwordsMatch ? "Senhas conferem" : "Senhas não conferem"}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acceptedTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <label htmlFor="acceptedTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Li e aceito os{" "}
                  <Link to="/termos" target="_blank" className="text-primary hover:underline">
                    Termos de Serviço
                  </Link>{" "}
                  e a{" "}
                  <Link to="/privacidade" target="_blank" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading || (!isLogin && !acceptedTerms)}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Continuar"
              )}
            </Button>
          </form>

          <Separator className="my-6" />

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword("");
                setConfirmPassword("");
              }}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Cadastre-se" : "Faça login"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default Auth;
