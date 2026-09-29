import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthPageShell from "@/components/auth/AuthPageShell";

const SUCCESS_MESSAGE = "Se este e-mail estiver cadastrado, você receberá um link em instantes";
const RESEND_DELAY_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isEmailValid = useMemo(
    () => EMAIL_PATTERN.test(email.trim()) && email.trim().length <= 254,
    [email],
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!isEmailValid || loading || cooldown > 0) return;

    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
    } finally {
      setSent(true);
      setCooldown(RESEND_DELAY_SECONDS);
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Recuperar senha"
      description="Informe o e-mail usado na sua conta para receber as instruções."
    >
      {sent && (
        <Alert className="mb-5 border-primary/30 bg-primary/5">
          <AlertDescription>{SUCCESS_MESSAGE}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="recovery-email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="recovery-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && !isEmailValid}
              aria-describedby={touched && !isEmailValid ? "recovery-email-error" : undefined}
              className="h-12 pl-10"
              required
            />
          </div>
          {touched && !isEmailValid && (
            <p id="recovery-email-error" role="alert" className="text-xs text-destructive">
              Digite um e-mail válido
            </p>
          )}
        </div>

        <Button type="submit" className="h-12 w-full gap-2" disabled={!isEmailValid || loading || cooldown > 0}>
          <Send className="h-4 w-4" />
          {loading
            ? "Enviando..."
            : cooldown > 0
              ? `Enviar novamente em ${cooldown}s`
              : sent
                ? "Enviar novamente"
                : "Enviar link de recuperação"}
        </Button>
      </form>
    </AuthPageShell>
  );
};

export default ForgotPassword;