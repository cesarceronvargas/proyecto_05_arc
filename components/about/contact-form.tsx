"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { sendContactMessage } from "@/app/about/actions";
import type { ContactField, ContactInput, ContactState } from "@/lib/contact";

const EMPTY: ContactInput = { name: "", email: "", message: "" };
const INITIAL: ContactState = { status: "idle" };

export default function ContactForm() {
  const [form, setForm] = useState<ContactInput>(EMPTY);
  const [website, setWebsite] = useState(""); // honeypot
  const [shake, setShake] = useState(false);
  // Result already closed with "ENVIAR OTRO MENSAJE" / "REINTENTAR"; each submit returns a new object.
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const [state, formAction] = useActionState(async (prev: ContactState, formData: FormData) => {
    const next = await sendContactMessage(prev, formData);
    if (next.status === "invalid") triggerShake();
    return next;
  }, INITIAL);

  const current = state === dismissed ? INITIAL : state;
  const errors = current.status === "invalid" ? current.errors : {};

  const set = (key: ContactField) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  // Submit by hand with a FormData built from state, so React does not reset the fields after the action.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      triggerShake();
      return;
    }
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("email", form.email);
    fd.set("message", form.message);
    fd.set("website", website);
    startTransition(() => formAction(fd));
  };

  const fieldProps = (key: ContactField) => ({
    id: `contact-${key}`,
    name: key,
    value: form[key],
    onChange: set(key),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `contact-${key}-error` : undefined,
  });

  const fieldError = (key: ContactField) =>
    errors[key] ? (
      <div id={`contact-${key}-error`} className="field-error">
        {errors[key]}
      </div>
    ) : null;

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {current.status === "success" ? (
        <div className="terminal-success" role="status">
          <TermBar />
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {current.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div className="term-actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setDismissed(state);
                  setForm(EMPTY);
                  setWebsite("");
                }}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : current.status === "error" ? (
        <div className="terminal-error" role="alert">
          <TermBar />
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line err">[ERR] Transmisión fallida.</div>
            <div className="line failure">
              &gt; NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS.
              <span className="caret">_</span>
            </div>
            <div className="term-actions">
              <button className="btn ghost" type="button" onClick={() => setDismissed(state)}>
                REINTENTAR
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input {...fieldProps("name")} placeholder="px_kai" />
            {fieldError("name")}
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input {...fieldProps("email")} type="email" placeholder="jugador@vault.gg" />
            {fieldError("email")}
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea {...fieldProps("message")} rows={5} placeholder="Cuéntanos qué tienes en mente…" />
            {fieldError("message")}
          </div>
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">Sitio web</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <button className="btn xl press w-full" type="submit">
            {"▶  ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}

function TermBar() {
  return (
    <div className="term-bar">
      <span className="dot r" /><span className="dot y" /><span className="dot g" />
      <span className="term-title">VAULT-OS // TERMINAL</span>
    </div>
  );
}
