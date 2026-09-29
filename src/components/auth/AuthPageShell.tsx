import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import premierpassLogo from "@/assets/premierpass-logo.png";

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

const AuthPageShell = ({ title, description, children }: AuthPageShellProps) => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md"
    >
      <Link
        to="/auth"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o login
      </Link>

      <section className="glass rounded-2xl border border-border/50 p-6 sm:p-8">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src={premierpassLogo} alt="Premier Pass" className="h-14 w-14 rounded-xl" />
          <div className="text-center">
            <span className="text-2xl font-bold text-foreground">
              Premier<span className="text-gradient">Pass</span>
            </span>
            <span className="block text-xs uppercase text-muted-foreground">Ingressos Premium</span>
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </section>
    </motion.div>
  </main>
);

export default AuthPageShell;