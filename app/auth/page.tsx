import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function AuthPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono mt-1.5 text-[11px] tracking-[0.16em] text-ink-faint">ACCESO AL SISTEMA · v2.6</div>
        </div>

        <AuthForm />

        <div className="mt-[18px] text-center text-[11px] tracking-[0.1em] text-ink-faint">
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
