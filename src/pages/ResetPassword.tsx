import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AuthPageShell from "@/components/auth/AuthPageShell";

type RecoveryState = "checking" | "ready" | "invalid" | "success";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPasswordValid = password.length >= 8;
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const canSubmit = useMemo(
    () => state === "ready" && isPasswordValid && passwordsMatch && !loading,
    [state, isPasswordValid, passwordsMatch, loading],
  );

  useEffect(() => {
    let mounted = true;
    let recoveryEventReceived = false;
    const url = new URL(window.location.href);
    const hasRecoveryMarker =
      url.searchParams.has("code") ||
      url.searchParams.get("type") === "recovery" ||
      new URLSearchParams(url.hash.replace(/^#/, "")).get("type") === "recovery";

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        recoveryEventReceived = true;
        setState("ready");
      } else if (event === "SIGNED_IN" && hasRecoveryMarker && session) {
        setState("ready");
      }
    });

    const verifyRecovery = async () => {
      if (url.searchParams.has("error") || url.searchParams.has("error_code")) {
        if (mounted) setState("invalid");
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (mounted) setState("invalid");
          return;
        }
      }

      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!mounted || recoveryEventReceived) return;
      setState(!sessionError && session && hasRecoveryMarker ? "ready" : "invalid");
    };

    void verifyRecovery();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state !== "success") return;
    const timer = window.setTimeout(() => navigate("/auth", { replace: true }), 2500);
    return () => window.clearTimeout(timer);
  }, [navigate, state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!canSubmit) return;

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível salvar a nova senha. Peça um novo link e tente novamente.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    window.history.replaceState({}, document.title, "/redefinir-senha");
    setState("success");
    setLoading(false);
  };

  if (state === "checking") {
    return (
      <AuthPageShell title="Validando link" description="Aguarde enquanto verificamos seu link de recuperação.">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AuthPageShell>
    );
  }

  if (state === "invalid") {
    return (
      <AuthPageShell title="Link inválido ou expirado" description="Este link não pode mais ser usado para alterar sua senha.">
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>Peça um novo link de recuperação para continuar com segurança.</AlertDescription>
        </Alert>
        <Button className="h-12 w-full" onClick={() => navigate("/esqueci-senha", { replace: true })}>
          Pedir novo link
        </Button>
      </AuthPageShell>
    );
  }

  if (state === "success") {
    return (
      <AuthPageShell title="Senha alterada" description="Sua nova senha foi salva com sucesso.">
        <Alert className="border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Tudo certo</AlertTitle>
          <AlertDescription>Você será direcionado para o login.</AlertDescription>
        </Alert>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title="Criar nova senha" description="Escolha uma senha segura com pelo menos 8 caracteres.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 pl-10 pr-11"
              required
              minLength={8}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>
          {password.length > 0 && !isPasswordValid && <p className="text-xs text-destructive">Use pelo menos 8 caracteres</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-new-password"
              type={showConfirmation ? "text" : "password"}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-12 pl-10 pr-11"
              required
              minLength={8}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={showConfirmation ? "Ocultar confirmação" : "Mostrar confirmação"} onClick={() => setShowConfirmation((value) => !value)} className="absolute right-1 top-1/2 -translate-y-1/2">
              {showConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>
          {confirmation.length > 0 && !passwordsMatch && <p className="text-xs text-destructive">As senhas não conferem</p>}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-12 w-full" disabled={!canSubmit}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthPageShell>
  );
};

export default ResetPassword;