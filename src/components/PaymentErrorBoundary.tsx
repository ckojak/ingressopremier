 import React, { Component, ErrorInfo, ReactNode } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
 
 interface Props {
   children: ReactNode;
   fallbackTitle?: string;
   fallbackMessage?: string;
   onRetry?: () => void;
 }
 
 interface State {
   hasError: boolean;
   error?: Error;
 }
 
 class PaymentErrorBoundary extends Component<Props, State> {
   public state: State = {
     hasError: false,
   };
 
   public static getDerivedStateFromError(error: Error): State {
     return { hasError: true, error };
   }
 
   public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     // Log error to monitoring service in production
     console.error("PaymentErrorBoundary caught error:", error.message);
   }
 
   private handleRetry = () => {
     this.setState({ hasError: false, error: undefined });
     if (this.props.onRetry) {
       this.props.onRetry();
     }
   };
 
   public render() {
     if (this.state.hasError) {
       return (
         <div className="min-h-screen bg-background flex items-center justify-center p-4">
           <Card className="max-w-md w-full border-destructive/20">
             <CardContent className="pt-8 pb-6 text-center">
               <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <AlertTriangle className="w-8 h-8 text-destructive" />
               </div>
               
               <h2 className="text-xl font-semibold text-foreground mb-3">
                 {this.props.fallbackTitle || "Erro no processamento"}
               </h2>
               
               <p className="text-muted-foreground mb-6 leading-relaxed">
                 {this.props.fallbackMessage || 
                   "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente ou entre em contato com o suporte."}
               </p>
               
               <div className="flex flex-col sm:flex-row gap-3">
                 <Button
                   onClick={this.handleRetry}
                   className="flex-1 gap-2"
                   variant="default"
                 >
                   <RefreshCw className="w-4 h-4" />
                   Tentar novamente
                 </Button>
                 <Button
                   onClick={() => window.history.back()}
                   variant="outline"
                   className="flex-1 gap-2"
                 >
                   <ArrowLeft className="w-4 h-4" />
                   Voltar
                 </Button>
               </div>
               
               <Button
                 onClick={() => window.location.href = "/"}
                 variant="ghost"
                 className="mt-4 gap-2 text-muted-foreground"
               >
                 <Home className="w-4 h-4" />
                 Ir para o início
               </Button>
             </CardContent>
           </Card>
         </div>
       );
     }
 
     return this.props.children;
   }
 }
 
 export default PaymentErrorBoundary;