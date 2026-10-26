"use client";

import { useEffect } from "react";

// Activa la animación .reveal del Home: marca el contenedor con .reveal-ready (solo entonces el CSS oculta
// las secciones) y añade .in a cada sección la primera vez que entra en el viewport.
export default function RevealObserver() {
  useEffect(() => {
    const home = document.querySelector(".home");
    if (!home) return;
    const els = home.querySelectorAll(".reveal:not(.in)");
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
    home.classList.add("reveal-ready");
    return () => io.disconnect();
  }, []);

  return null;
}
