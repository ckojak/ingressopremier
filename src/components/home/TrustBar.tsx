import { Shield, FileCheck, Award, Headphones } from "lucide-react";

const trustItems = [
  {
    icon: Shield,
    title: "Pagamento Seguro",
    description: "Criptografia SSL 256-bit",
  },
  {
    icon: FileCheck,
    title: "LGPD Compliant",
    description: "Seus dados protegidos",
  },
  {
    icon: Award,
    title: "Garantia Total",
    description: "Reembolso garantido",
  },
  {
    icon: Headphones,
    title: "Suporte 24/7",
    description: "Atendimento humanizado",
  },
];

const TrustBar = () => {
  return (
    <section className="bg-card/50 border-b border-border py-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {trustItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
