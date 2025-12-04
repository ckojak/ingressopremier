import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Mail, Lock, User, ArrowLeft, Building2, Users, Check, X, Eye, EyeOff, Phone, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

type UserType = "client" | "organizer";

interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

// CPF mask function
const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Phone mask function
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// CPF validation function
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

// Phone validation function
const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<UserType>("client");
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get redirect URL from state or default to home
  const from = (location.state as any)?.from || "/";

  // Password strength validation
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

  // Additional validation for client signup
  const isClientFieldsValid = useMemo(() => {
    if (userType !== "client" || isLogin) return true;
    return isValidCPF(cpf) && isValidPhone(phone);
  }, [userType, isLogin, cpf, phone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          if (roleData?.role === "admin") {
            navigate("/admin");
          } else if (roleData?.role === "organizer") {
            navigate("/admin");
          } else {
            navigate(from);
          }
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (roleData?.role === "admin") {
          navigate("/admin");
        } else if (roleData?.role === "organizer") {
          navigate("/admin");
        } else {
          navigate(from);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, from]);

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
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
    
    // Validation for signup
    if (!isLogin) {
      if (!fullName.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, insira seu nome completo.",
          variant: "destructive",
        });
        return;
      }

      if (userType === "client") {
        if (!isValidCPF(cpf)) {
          toast({
            title: "CPF inválido",
            description: "Por favor, insira um CPF válido.",
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
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta.",
        });
      } else {
        // Sign up - role is set automatically by database trigger based on user_type
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: fullName,
              user_type: userType,
              cpf: userType === "client" ? cpf.replace(/\D/g, "") : null,
              phone: userType === "client" ? phone.replace(/\D/g, "") : null,
            },
          },
        });
        if (error) throw error;

        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Verifique seu email para confirmar a conta e depois faça login.",
        });

        // Clear form and switch to login
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setCpf("");
        setPhone("");
        setUserType("client");
        setIsLogin(true);
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center"
          >
            <Ticket className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-foreground"
          >
            Event<span className="text-gradient">ix</span>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 200 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-1 bg-primary rounded-full"
          />
        </motion.div>
      </div>
    );
  }

  return (
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
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>

        <div className="glass rounded-2xl p-8 border border-border/50">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              Event<span className="text-gradient">ix</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {isLogin ? "Bem-vindo de volta!" : "Crie sua conta"}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {isLogin
              ? "Entre com suas credenciais para continuar"
              : "Preencha os dados para se cadastrar"}
          </p>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 gap-3"
              onClick={() => handleOAuthSignIn('google')}
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
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 gap-3"
              onClick={() => handleOAuthSignIn('apple')}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continuar com Apple
            </Button>
          </div>

          <div className="relative mb-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs text-muted-foreground">
              ou continue com email
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <Label className="text-sm text-muted-foreground mb-3 block">Tipo de conta</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserType("client")}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      userType === "client"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="font-medium text-sm">Sou Cliente</span>
                    <span className="text-xs opacity-70">Comprar ingressos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("organizer")}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      userType === "organizer"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                    <span className="font-medium text-sm">Sou Organizador</span>
                    <span className="text-xs opacity-70">Criar eventos</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                        className="pl-10 h-12 bg-secondary/50 border-border"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  {/* CPF and Phone fields - only for client type */}
                  {userType === "client" && (
                    <>
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
                            className={`pl-10 h-12 bg-secondary/50 border-border ${
                              cpf.length > 0 && !isValidCPF(cpf) ? "border-red-500" : ""
                            } ${cpf.length > 0 && isValidCPF(cpf) ? "border-green-500" : ""}`}
                            required={userType === "client" && !isLogin}
                          />
                        </div>
                        {cpf.length > 0 && !isValidCPF(cpf) && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            CPF inválido
                          </p>
                        )}
                        {cpf.length > 0 && isValidCPF(cpf) && (
                          <p className="text-xs text-green-500 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            CPF válido
                          </p>
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
                            className={`pl-10 h-12 bg-secondary/50 border-border ${
                              phone.length > 0 && !isValidPhone(phone) ? "border-red-500" : ""
                            } ${phone.length > 0 && isValidPhone(phone) ? "border-green-500" : ""}`}
                            required={userType === "client" && !isLogin}
                          />
                        </div>
                        {phone.length > 0 && !isValidPhone(phone) && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Telefone inválido
                          </p>
                        )}
                        {phone.length > 0 && isValidPhone(phone) && (
                          <p className="text-xs text-green-500 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Telefone válido
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-secondary/50 border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password strength indicators - only show on signup */}
            <AnimatePresence mode="wait">
              {!isLogin && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-secondary/50 rounded-lg border border-border"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos da senha:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <PasswordRequirement met={passwordStrength.hasMinLength} text="Mínimo 8 caracteres" />
                    <PasswordRequirement met={passwordStrength.hasUppercase} text="Letra maiúscula" />
                    <PasswordRequirement met={passwordStrength.hasLowercase} text="Letra minúscula" />
                    <PasswordRequirement met={passwordStrength.hasNumber} text="Número" />
                    <PasswordRequirement met={passwordStrength.hasSpecial} text="Caractere especial" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm password field - only show on signup */}
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 pr-10 h-12 bg-secondary/50 border-border ${
                        confirmPassword.length > 0 && !passwordsMatch ? "border-red-500" : ""
                      } ${passwordsMatch ? "border-green-500" : ""}`}
                      required={!isLogin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      As senhas não conferem
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Senhas conferem
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast({
                        title: "Informe seu email",
                        description: "Digite seu email para recuperar a senha.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/auth`,
                      });
                      if (error) throw error;
                      toast({
                        title: "Email enviado!",
                        description: "Verifique sua caixa de entrada para redefinir sua senha.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Erro",
                        description: error.message,
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={loading || (!isLogin && (!isPasswordStrong || !passwordsMatch || !isClientFieldsValid))}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Ticket className="w-5 h-5" />
                </motion.div>
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setUserType("client");
                setPassword("");
                setConfirmPassword("");
                setCpf("");
                setPhone("");
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Não tem uma conta? Cadastre-se"
                : "Já tem uma conta? Entre"}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Dados criptografados
              </span>
              <span className="flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                Compra segura
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;