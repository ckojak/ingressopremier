import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "premierpass_cookie_consent";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: Omit<Consent, "necessary" | "decidedAt">) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ necessary: true, ...consent, decidedAt: new Date().toISOString() })
      );
    } catch {
      /* ignora storage bloqueado */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              Usamos cookies para manter o site funcionando, lembrar suas preferências e
              entender como você usa a plataforma. Você pode aceitar todos, rejeitar os
              opcionais ou escolher o que permitir. Saiba mais na{" "}
              <a href="/privacidade" className="text-primary underline underline-offset-2">
                Política de Privacidade
              </a>
              .
            </p>

            {showPrefs && (
              <div className="space-y-3 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Necessários</p>
                    <p className="text-xs text-muted-foreground">
                      Login, carrinho e segurança. Sempre ativos.
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Análise</p>
                    <p className="text-xs text-muted-foreground">Métricas de uso do site.</p>
                  </div>
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Marketing</p>
                    <p className="text-xs text-muted-foreground">Anúncios e remarketing.</p>
                  </div>
                  <Switch checked={marketing} onCheckedChange={setMarketing} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => save({ analytics: true, marketing: true })}>
                Aceitar todos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => save({ analytics: false, marketing: false })}
              >
                Rejeitar opcionais
              </Button>
              {showPrefs ? (
                <Button size="sm" variant="ghost" onClick={() => save({ analytics, marketing })}>
                  Salvar preferências
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setShowPrefs(true)}>
                  Preferências
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
