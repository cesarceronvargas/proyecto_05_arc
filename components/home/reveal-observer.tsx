"use client";

import { useEffect } from "react";

// Activa la animación .reveal dentro del contenedor `root` (el Home por defecto): lo marca con .reveal-ready
// (solo entonces el CSS oculta las secciones) y añade .in a cada sección la primera vez que entra en el viewport.
export default function RevealObserver({ root = ".home" }: { root?: string }) {
  useEffect(() => {
    const container = document.querySelector(root);
    if (!container) return;
    const els = container.querySelectorAll(".reveal:not(.in)");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    container.classList.add("reveal-ready");
    return () => io.disconnect();
  }, [root]);

  return null;
}
