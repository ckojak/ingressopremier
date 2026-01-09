import { useState } from "react";
import { motion } from "framer-motion";
import { User, Building2, ArrowRight, Ticket, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import premierpassLogo from "@/assets/premierpass-logo.png";

interface UserTypeSelectorProps {
  open: boolean;
  onSelect: (type: "client" | "producer") => void;
  loading?: boolean;
}

const UserTypeSelector = ({ open, onSelect, loading }: UserTypeSelectorProps) => {
  const [selectedType, setSelectedType] = useState<"client" | "producer" | null>(null);

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-lg sm:max-w-xl p-0 overflow-hidden border-border/50 bg-card"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 justify-center mb-4">
            <img src={premierpassLogo} alt="PremierPass" className="w-12 h-12 rounded-xl" />
            <div className="text-center">
              <span className="text-xl font-display font-bold text-foreground">
                Premier<span className="text-gradient">Pass</span>
              </span>
            </div>
          </div>
          
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-display">
              Como você deseja usar o PremierPass?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha seu perfil para personalizar sua experiência
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-300 ${
                selectedType === "client" 
                  ? "border-primary shadow-premium bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-secondary/30"
              }`}
              onClick={() => setSelectedType("client")}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                    selectedType === "client" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>
                    <User className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Sou Cliente</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Quero comprar ingressos para eventos incríveis
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary/50 px-2.5 py-1 rounded-full">
                        <Ticket className="w-3 h-3" /> Comprar ingressos
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary/50 px-2.5 py-1 rounded-full">
                        <Calendar className="w-3 h-3" /> Ver eventos
                      </span>
                    </div>
                  </div>
                  {selectedType === "client" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-300 ${
                selectedType === "producer" 
                  ? "border-accent shadow-accent bg-accent/5" 
                  : "border-border hover:border-accent/50 hover:bg-secondary/30"
              }`}
              onClick={() => setSelectedType("producer")}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                    selectedType === "producer" ? "bg-accent text-accent-foreground" : "bg-secondary"
                  }`}>
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Sou Produtor</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Quero criar e gerenciar meus próprios eventos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary/50 px-2.5 py-1 rounded-full">
                        <Calendar className="w-3 h-3" /> Criar eventos
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary/50 px-2.5 py-1 rounded-full">
                        <BarChart3 className="w-3 h-3" /> Relatórios
                      </span>
                    </div>
                  </div>
                  {selectedType === "producer" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-accent flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-accent-foreground" />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Button 
            className="w-full h-12 mt-4 gradient-primary text-white font-semibold"
            disabled={!selectedType || loading}
            onClick={handleConfirm}
          >
            {loading ? "Salvando..." : "Continuar"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserTypeSelector;
