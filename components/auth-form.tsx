"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, logout } from "@/lib/storage";

type Tab = "in" | "up";

// Simulated access: nothing is validated or sent anywhere, only the user name is kept.
export default function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("in");
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login(user);
    router.push("/");
  };

  const playAsGuest = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <div className="auth-tabs">
        <button type="button" aria-pressed={tab === "in"} className={tab === "in" ? "on" : ""} onClick={() => setTab("in")}>
          INICIAR SESIÓN
        </button>
        <button type="button" aria-pressed={tab === "up"} className={tab === "up" ? "on" : ""} onClick={() => setTab("up")}>
          CREAR CUENTA
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="auth-user">Usuario</label>
          <input id="auth-user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="px_kai" autoComplete="username" />
        </div>
        {tab === "up" && (
          <div className="field slide-in">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jugador@vault.gg" autoComplete="email" />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-pass">Contraseña</label>
          <input
            id="auth-pass"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            autoComplete={tab === "in" ? "current-password" : "new-password"}
          />
        </div>

        <button className="btn lg mt-2 w-full" type="submit">
          {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
        </button>
      </form>

      <button type="button" className="btn ghost mt-2.5 w-full" onClick={playAsGuest}>
        JUGAR COMO INVITADO
      </button>
    </>
  );
}
