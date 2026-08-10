import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Shield, 
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { useSiteContext } from "@/hooks/useSiteContext";

interface ValidationResult {
  valid: boolean;
  configured: boolean;
  is_sandbox?: boolean;
  account_info?: {
    id: number;
    nickname: string;
    email: string;
    site_id: string;
    country_id: string;
  };
  error?: string;
}

interface SiteCredentials {
  site_id: string;
  site_name: string;
  accessTokenSecret: string;
  webhookSecretSecret: string;
  validation: ValidationResult | null;
  validating: boolean;
}

const PaymentSettings = () => {
  const { siteId } = useSiteContext();
  const [sites, setSites] = useState<SiteCredentials[]>([
    {
      site_id: 'premierpass',
      site_name: 'PremierPass',
      accessTokenSecret: 'PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN',
      webhookSecretSecret: 'PREMIERPASS_MERCADOPAGO_WEBHOOK_SECRET',
      validation: null,
      validating: false
    }
  ]);

  const [newTokens, setNewTokens] = useState<Record<string, { accessToken: string; webhookSecret: string }>>({
    premierpass: { accessToken: '', webhookSecret: '' }
  });

  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({
    premierpass: false
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({
    premierpass: false
  });

  const validateCredentials = async (siteIndex: number) => {
    const site = sites[siteIndex];
    
    setSites(prev => prev.map((s, i) => 
      i === siteIndex ? { ...s, validating: true } : s
    ));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await supabase.functions.invoke('validate-mercadopago', {
        body: { site_id: site.site_id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as ValidationResult;
      
      setSites(prev => prev.map((s, i) => 
        i === siteIndex ? { ...s, validation: result, validating: false } : s
      ));

      if (result.valid) {
        toast.success(`Credenciais do ${site.site_name} validadas com sucesso!`);
      } else if (result.configured) {
        toast.error(`Credenciais do ${site.site_name} inválidas`);
      } else {
        toast.warning(`Credenciais do ${site.site_name} não configuradas`);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setSites(prev => prev.map((s, i) => 
        i === siteIndex ? { 
          ...s, 
          validation: { valid: false, configured: false, error: 'Erro ao validar' },
          validating: false 
        } : s
      ));
      toast.error('Erro ao validar credenciais');
    }
  };

  const handleSaveCredentials = async (siteId: string) => {
    const tokens = newTokens[siteId];
    
    if (!tokens.accessToken && !tokens.webhookSecret) {
      toast.error('Preencha pelo menos um campo para salvar');
      return;
    }

    setSaving(prev => ({ ...prev, [siteId]: true }));

    try {
      // Note: In a real implementation, you would need to use the Lovable secrets tool
      // or a secure backend endpoint to update secrets
      // For now, we'll show instructions to the user
      
      toast.info(
        'Para atualizar as credenciais de forma segura, use o chat do Lovable e peça para atualizar os secrets.',
        { duration: 8000 }
      );

      // Clear the form
      setNewTokens(prev => ({
        ...prev,
        [siteId]: { accessToken: '', webhookSecret: '' }
      }));

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setSaving(prev => ({ ...prev, [siteId]: false }));
    }
  };

  const validateAllSites = () => {
    sites.forEach((_, index) => validateCredentials(index));
  };

  useEffect(() => {
    // Validate all sites on mount
    validateAllSites();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Configurações de Pagamento
          </h1>
          <p className="text-muted-foreground">
            Gerencie as credenciais das plataformas de pagamento
          </p>
        </div>

        <Button onClick={validateAllSites} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Validar Todas
        </Button>
      </div>

      {/* Security Notice */}
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <Shield className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Segurança</AlertTitle>
        <AlertDescription className="text-yellow-500/80">
          As credenciais são armazenadas de forma segura e criptografada. 
          Para atualizar, use o chat do Lovable com o comando de atualização de secrets.
        </AlertDescription>
      </Alert>

      {/* Sites Configuration */}
      <Tabs defaultValue="premierpass" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="premierpass" className="gap-2 w-full">
            <Building2 className="w-4 h-4" />
            PremierPass
          </TabsTrigger>
        </TabsList>

        {sites.map((site, index) => (
          <TabsContent key={site.site_id} value={site.site_id} className="space-y-4">
            {/* Status Card */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Status do Mercado Pago - {site.site_name}</span>
                  {site.validating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : site.validation?.valid ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Ativo
                    </Badge>
                  ) : site.validation?.configured ? (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                      <XCircle className="w-3 h-3" />
                      Inválido
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Não Configurado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Secret: {site.accessTokenSecret}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {site.validation?.valid && site.validation.account_info && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div>
                      <p className="text-xs text-muted-foreground">ID da Conta</p>
                      <p className="font-mono text-sm">{site.validation.account_info.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Usuário</p>
                      <p className="text-sm">{site.validation.account_info.nickname}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm truncate">{site.validation.account_info.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ambiente</p>
                      <Badge variant={site.validation.is_sandbox ? "outline" : "default"}>
                        {site.validation.is_sandbox ? "Sandbox" : "Produção"}
                      </Badge>
                    </div>
                  </div>
                )}

                {site.validation?.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{site.validation.error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={() => validateCredentials(index)} 
                  disabled={site.validating}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {site.validating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Validar Credenciais
                </Button>
              </CardContent>
            </Card>

            {/* Update Credentials Card */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Atualizar Credenciais
                </CardTitle>
                <CardDescription>
                  Para atualizar as credenciais, você precisará usar o Lovable Chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${site.site_id}-token`}>Access Token</Label>
                  <div className="relative">
                    <Input
                      id={`${site.site_id}-token`}
                      type={showTokens[site.site_id] ? "text" : "password"}
                      placeholder="APP_USR-xxxx... ou TEST-xxxx..."
                      value={newTokens[site.site_id]?.accessToken || ''}
                      onChange={(e) => setNewTokens(prev => ({
                        ...prev,
                        [site.site_id]: { ...prev[site.site_id], accessToken: e.target.value }
                      }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowTokens(prev => ({ ...prev, [site.site_id]: !prev[site.site_id] }))}
                    >
                      {showTokens[site.site_id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tokens de produção começam com APP_USR-, tokens de sandbox começam com TEST-
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${site.site_id}-webhook`}>Webhook Secret</Label>
                  <Input
                    id={`${site.site_id}-webhook`}
                    type="password"
                    placeholder="Webhook secret para validação de assinatura"
                    value={newTokens[site.site_id]?.webhookSecret || ''}
                    onChange={(e) => setNewTokens(prev => ({
                      ...prev,
                      [site.site_id]: { ...prev[site.site_id], webhookSecret: e.target.value }
                    }))}
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Como atualizar</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>Para atualizar as credenciais de forma segura:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Copie o novo Access Token do Mercado Pago</li>
                      <li>No chat do Lovable, peça: "Atualize o secret {site.accessTokenSecret}"</li>
                      <li>Cole o token no formulário que aparecerá</li>
                      <li>Repita para o Webhook Secret se necessário</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      const tokenName = site.accessTokenSecret;
                      navigator.clipboard.writeText(`Atualize o secret ${tokenName} com meu novo token do Mercado Pago`);
                      toast.success('Comando copiado! Cole no chat do Lovable');
                    }}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    Copiar Comando
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Onde encontrar suas credenciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Access Token:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Acesse mercadopago.com.br e faça login</li>
                    <li>Vá em Seu negócio → Configurações → Gestão e Administração</li>
                    <li>Clique em Credenciais</li>
                    <li>Copie o Access Token de Produção (APP_USR-...)</li>
                  </ol>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Webhook Secret:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Na mesma página de credenciais</li>
                    <li>Vá na seção de Webhooks</li>
                    <li>Configure a URL do webhook</li>
                    <li>Copie a chave secreta gerada</li>
                  </ol>
                </div>

                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <AlertTriangle className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-500">URL do Webhook</AlertTitle>
                  <AlertDescription className="text-blue-500/80 font-mono text-xs break-all">
                    https://rbkuplzntpayendbfzud.supabase.co/functions/v1/mercadopago-webhook
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PaymentSettings;
