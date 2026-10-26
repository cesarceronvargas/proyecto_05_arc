import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sin señal",
};

export default function NotFound() {
  return (
    <div className="av-404 fade-in">
      <div className="crt">
        <div className="crt-screen">
          <div className="crt-static" />
          <div className="crt-content">
            <div>
              <div className="pixel neon-yellow text-[10px] tracking-[0.3em]">SIN SEÑAL</div>
              <div className="av-404-code flicker">404</div>
              <p className="mx-auto mt-2 max-w-[32ch] px-4 font-mono text-[13px] normal-case tracking-normal text-ink-dim">
                Este juego no existe o la dirección está mal escrita.
              </p>
            </div>
          </div>
        </div>
        <div className="crt-bottom">
          <span className="led off">SIN SEÑAL</span>
          <span>CANAL 404</span>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  );
}
