 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { WifiOff, RefreshCw, Database } from "lucide-react";
 
 interface ApiErrorFallbackProps {
   title?: string;
   message?: string;
   onRetry?: () => void;
   isLoading?: boolean;
   type?: "network" | "database" | "generic";
 }
 
 const ApiErrorFallback = ({
   title = "Não foi possível carregar",
   message = "Ocorreu um erro ao buscar os dados. Verifique sua conexão e tente novamente.",
   onRetry,
   isLoading = false,
   type = "generic",
 }: ApiErrorFallbackProps) => {
   const Icon = type === "network" ? WifiOff : type === "database" ? Database : WifiOff;
 
   return (
     <Card className="border-border/50 bg-card/50">
       <CardContent className="py-12 text-center">
         <div className="w-14 h-14 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-5">
           <Icon className="w-7 h-7 text-muted-foreground" />
         </div>
         <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
         <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
         {onRetry && (
           <Button
             onClick={onRetry}
             disabled={isLoading}
             variant="outline"
             className="gap-2"
           >
             <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
             {isLoading ? "Carregando..." : "Tentar novamente"}
           </Button>
         )}
       </CardContent>
     </Card>
   );
 };
 
 export default ApiErrorFallback;