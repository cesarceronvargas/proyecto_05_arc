"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UserMenu from "@/components/user-menu";
import { logout, useUser } from "@/lib/storage";

type Section = "inicio" | "biblioteca" | "salon" | "auth";

function sectionOf(pathname: string): Section | null {
  if (pathname === "/") return "inicio";
  if (pathname === "/games" || pathname.startsWith("/games/")) return "biblioteca";
  if (pathname.startsWith("/salon")) return "salon";
  if (pathname.startsWith("/auth")) return "auth";
  return null;
}

export default function Nav() {
  const pathname = usePathname();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const section = sectionOf(pathname);
  const active = (s: Section) => (section === s ? "active" : undefined);
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo">
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={active("inicio")}>Inicio</Link>
          <Link href="/games" className={active("biblioteca")}>Biblioteca</Link>
          <Link href="/salon" className={active("salon")}>Salón de la Fama</Link>
        </div>
        <div className="spacer" />
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Link href="/auth" className="btn auth-btn">Iniciar Sesión</Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
        >
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close} />
      <aside className={"av-mobile-panel" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="pixel neon-cyan mb-4 text-[11px]">MENÚ</div>
        <Link href="/" className={active("inicio")} onClick={close}>Inicio</Link>
        <Link href="/games" className={active("biblioteca")} onClick={close}>Biblioteca</Link>
        <Link href="/salon" className={active("salon")} onClick={close}>Salón de la Fama</Link>
        <Link href="/auth" className={active("auth")} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        {user && (
          <button
            type="button"
            className="signout"
            onClick={() => {
              close();
              logout();
            }}
          >
            Cerrar sesión
          </button>
        )}
      </aside>
    </>
  );
}
