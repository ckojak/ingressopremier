import { useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganizerVerification } from "@/hooks/useOrganizerVerification";

const statusMeta: Record<string, { label: string; className: string; icon: any }> = {
  pending: {
    label: "Documento em análise",
    className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    icon: ShieldQuestion,
  },
  verified: {
    label: "Identidade verificada",
    className: "bg-green-500/20 text-green-500 border-green-500/30",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Documento recusado",
    className: "bg-destructive/20 text-destructive border-destructive/30",
    icon: ShieldAlert,
  },
};

const OrganizerVerificationCard = () => {
  const { verification, loading, refetch } = useOrganizerVerification();
  const [documentType, setDocumentType] = useState("cpf");
  const [documentNumber, setDocumentNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^(image\/|application\/pdf)/.test(file.type)) {
      toast.error("Envie uma foto (JPG/PNG) ou PDF do documento");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 8MB");
      return;
    }
    if (!documentNumber.trim()) {
      toast.error("Informe o número do documento antes de enviar");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("organizer-documents")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const payload = {
        user_id: user.id,
        document_type: documentType,
        document_number: documentNumber.trim(),
        document_path: path,
        status: "pending",
        rejection_reason: null,
      };

      const { error: saveError } = verification
        ? await supabase
            .from("organizer_verifications")
            .update(payload)
            .eq("user_id", user.id)
        : await supabase.from("organizer_verifications").insert([payload]);

      if (saveError) throw saveError;

      toast.success("Documento enviado! Nossa equipe fará a verificação.");
      refetch();
    } catch (error: any) {
      console.error("Verification upload error:", error);
      toast.error(error.message || "Erro ao enviar documento");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const meta = verification ? statusMeta[verification.status] : null;
  const StatusIcon = meta?.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-foreground flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Verificação de identidade
        </CardTitle>
        {meta && StatusIcon && (
          <Badge variant="outline" className={meta.className}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {meta.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Para publicar eventos, precisamos confirmar quem é o responsável. Envie uma foto
          do documento (CPF ou CNPJ) do responsável pelo evento. O arquivo fica em área
          privada e só é acessado pela nossa equipe de verificação.
        </p>

        {verification?.status === "rejected" && verification.rejection_reason && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Motivo da recusa: {verification.rejection_reason}
          </div>
        )}

        {verification?.status === "verified" ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-500">
            Sua identidade está verificada. Seus eventos podem ser aprovados normalmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF (pessoa física)</SelectItem>
                  <SelectItem value="cnpj">CNPJ (empresa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">Número do documento</Label>
              <Input
                id="document_number"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder={documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                maxLength={20}
              />
            </div>
            <div className="sm:col-span-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                disabled={uploading || loading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {verification ? "Enviar novo documento" : "Enviar foto do documento"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizerVerificationCard;