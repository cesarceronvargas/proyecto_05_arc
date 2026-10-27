import type { ContactInput } from "@/lib/contact";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// Email sent to the team for each contact message. Every user value is escaped in the HTML.
export function buildContactEmail(input: ContactInput, sentAt: Date) {
  const { name, email, message } = input;
  const date = sentAt.toLocaleString("es-ES");
  // Line breaks in the subject would break the header.
  const subject = `[Arcade Vault] Nuevo mensaje de ${name.replace(/[\r\n]+/g, " ")}`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#8a8aa3;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;vertical-align:top">${label}</td><td style="padding:6px 0;color:#0a0a0f;font-size:14px">${value}</td></tr>`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f4f4f8;font-family:Menlo,Consolas,monospace">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e0e0ea;padding:24px">
      <h1 style="margin:0 0 16px;font-size:16px;letter-spacing:0.1em;color:#0a0a0f">▸ NUEVO MENSAJE DE CONTACTO</h1>
      <table style="border-collapse:collapse;width:100%">
        ${row("Nombre", escapeHtml(name))}
        ${row("Correo", `<a href="mailto:${escapeHtml(email)}" style="color:#0077aa">${escapeHtml(email)}</a>`)}
        ${row("Fecha", escapeHtml(date))}
      </table>
      <div style="margin-top:16px;padding:16px;background:#f4f4f8;border-left:3px solid #00b8c4;color:#0a0a0f;font-size:14px;line-height:1.6">${escapeHtml(message).replace(/\r?\n/g, "<br>")}</div>
      <p style="margin:16px 0 0;color:#8a8aa3;font-size:12px">Enviado desde el formulario de /about. Responde a este correo para contestar a ${escapeHtml(name)}.</p>
    </div>
  </body>
</html>`;

  const text = [
    "NUEVO MENSAJE DE CONTACTO",
    "",
    `Nombre: ${name}`,
    `Correo: ${email}`,
    `Fecha: ${date}`,
    "",
    message,
    "",
    "Enviado desde el formulario de /about.",
  ].join("\n");

  return { subject, html, text };
}
