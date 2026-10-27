import type { Metadata } from "next";
import ContactForm from "@/components/about/contact-form";
import HighlightIcon, { type HighlightKind } from "@/components/about/highlight-icon";
import RevealObserver from "@/components/home/reveal-observer";
import type { AccentColor } from "@/lib/games";

const HIGHLIGHTS: { icon: HighlightKind; text: string; color: AccentColor }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export const metadata: Metadata = {
  title: "Acerca de",
};

export default function AboutPage() {
  return (
    <div className="about fade-in">
      <RevealObserver root=".about" />

      {/* ACERCA DE */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar los
          arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h) => (
            <div key={h.icon} className={`highlight ${h.color}`}>
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divisor */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar" />
        <div className="div-pixels">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="div-bar" />
      </div>

      {/* CONTACTO */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar? Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip"><span className="tip-led" />RESPUESTA EN 24-48H</div>
              <div className="tip"><span className="tip-led y" />SUGERENCIAS BIENVENIDAS</div>
              <div className="tip"><span className="tip-led m" />SIN SPAM, JAMÁS</div>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </div>
  );
}
