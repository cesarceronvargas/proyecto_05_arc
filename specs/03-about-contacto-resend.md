# SPEC 03 — Acerca de y formulario de contacto con Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-26
> **Objetivo:** Implementar en `/about` la página "Acerca de" de `references/templates/home-about/about.jsx` con un formulario de contacto que envía un correo real al equipo mediante Resend.

## Por qué existe esta spec

La SPEC 02 dejó fuera la página "Acerca de", su formulario y el enlace de la Nav, y los reservó para esta spec.
En la plantilla el formulario solo simula el envío: valida en cliente y muestra la terminal de éxito sin salir del navegador.
Esta spec porta la página 1:1 a App Router y conecta el formulario a un envío real con Resend desde una Server Action, sin exponer la API key al cliente.

## Alcance

**Dentro:**

- **Página "Acerca de"** (`/about`, `app/about/page.tsx`, Server Component) con las tres partes de `about.jsx`, en este orden:
  1. Hero: kicker `▸ ACERCA DE`, título "ACERCA DE ARCADE VAULT", texto de misión y fila de 3 `highlight` con iconos pixel (HEART magenta, BROWSER cian, PLANT verde) y sus textos de la plantilla.
  2. Divisor `about-divider` con 24 píxeles parpadeantes (`aria-hidden="true"`).
  3. Contacto: kicker `▸ CONTACTO`, título "CONTÁCTANOS", subtítulo, 3 `tip` con LED (RESPUESTA EN 24-48H, SUGERENCIAS BIENVENIDAS, SIN SPAM, JAMÁS) y el formulario.
- Animación `reveal` en el divisor y en la sección de contacto, reutilizando `components/home/reveal-observer.tsx` (umbral 0.12, una sola vez, sin JS todo se ve).
- **Formulario de contacto** (`components/about/contact-form.tsx`, cliente):
  - Campos NOMBRE (placeholder `px_kai`), CORREO ELECTRÓNICO (`type="email"`, placeholder `jugador@vault.gg`) y MENSAJE (`textarea`, 5 filas, placeholder `Cuéntanos qué tienes en mente…`), cada uno con su `<label htmlFor>`.
  - Campo honeypot oculto `website` (fuera de pantalla, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden="true"`).
  - Botón "▶  ENVIAR MENSAJE" (`btn xl press`, ancho completo).
  - Validación en cliente como la plantilla: si algún campo está vacío tras `trim`, el formulario hace `shake` (400 ms) y no se envía.
  - Envío con `useActionState` a la Server Action `sendContactMessage`.
  - Errores de validación del servidor: texto en magenta bajo el campo afectado y `shake` del formulario. Lo escrito se conserva.
  - **Éxito:** terminal `VAULT-OS // TERMINAL` en verde de la plantilla, con las líneas `[OK]` y "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE}." y el botón "ENVIAR OTRO MENSAJE", que vacía el formulario y lo vuelve a mostrar.
  - **Error de envío** (Resend falla, falta configuración): misma terminal en rojo (`terminal-error`), con `[OK] Conectando con servidor…`, `[OK] Validando contenido…`, `[ERR] Transmisión fallida.` y "&gt; NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS." y el botón "REINTENTAR", que vuelve al formulario conservando lo escrito.
- **Server Action** `sendContactMessage` en `app/about/actions.ts` (`"use server"`):
  - Lee `name`, `email`, `message` y `website` del `FormData`.
  - Si `website` tiene valor, devuelve éxito sin enviar nada.
  - Valida con `validateContact` (ver modelo de datos). Si hay errores, los devuelve sin llamar a Resend.
  - Envía un único correo al equipo con el SDK `resend`: `from` = `CONTACT_FROM_EMAIL`, `to` = `CONTACT_TO_EMAIL`, `replyTo` = correo del usuario, asunto `[Arcade Vault] Nuevo mensaje de {nombre}`, cuerpo HTML y texto plano.
  - El cliente de Resend se crea dentro de la acción (nunca al importar el módulo), para que el build no falle sin `RESEND_API_KEY`.
  - Si falta alguna variable de entorno o Resend devuelve `error`, registra el detalle con `console.error` en el servidor y devuelve `{ status: "error" }` sin detalles al cliente.
- **Plantilla del correo** en `lib/contact-email.ts`: HTML simple con estilos inline (nombre, correo, mensaje con saltos de línea, fecha de envío) y su versión en texto plano. Todos los valores del usuario se escapan en el HTML.
- **Variables de entorno** (en `.env.local`, que no se versiona):
  - `RESEND_API_KEY`: la proporciona el usuario.
  - `CONTACT_TO_EMAIL`: correo que recibe los mensajes (el de la cuenta de Resend mientras no haya dominio verificado).
  - `CONTACT_FROM_EMAIL`: remitente; si falta, se usa `Arcade Vault <onboarding@resend.dev>`.
- `.env.template` versionado con las tres variables vacías y un comentario por variable. Se añade `!.env.template` a `.gitignore` (hoy `.env*` lo ignora).
- Dependencia nueva: `resend`.
- Estilos de "Acerca de" portados de `references/templates/home-about/styles.css` a `app/globals.css`: `.about*`, `.highlight*`, `.hl-*`, `.div-bar`, `.div-pixels`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, `.btn.press`, `@keyframes shake` y `pxblink`, y sus media queries. Las reglas que ya existen en `globals.css` (por ejemplo `.field`) se conservan.
- Estilos nuevos: `.terminal-error` (borde y brillo magenta/rojo, líneas `[ERR]`), `.field-error` (texto de error bajo el campo) y la clase del honeypot.
- `prefers-reduced-motion: reduce`: sin `reveal`, sin `shake`, sin parpadeo de `div-pixels` ni del `caret`.
- **Nav:** enlace "Acerca de" (`/about`) después de "Salón de la Fama", en la barra y en el panel móvil, activo solo en `/about`.
- `metadata` de `/about`: título de pestaña "Acerca de · Arcade Vault".

**Fuera de alcance (para futuras specs):**

- Correo de confirmación o acuse de recibo al usuario (requiere dominio verificado en Resend).
- Verificar un dominio propio en Resend.
- Rate limiting, CAPTCHA o cualquier anti-spam distinto del honeypot.
- Guardar los mensajes en base de datos o en `localStorage`.
- Prellenar el nombre con el usuario de `av_user`.
- Estado de carga en el botón ("TRANSMITIENDO…") o deshabilitarlo durante el envío.
- Plantillas con React Email o cualquier otra librería de correo.
- Zod u otra librería de validación.
- Panel de administración para leer los mensajes.
- Tests automatizados.

## Modelo de datos

No hay datos persistentes. La única estructura nueva es la entrada y la respuesta del formulario, en `lib/contact.ts`:

```ts
export const CONTACT_LIMITS = {
  name: 50,          // máximo de caracteres
  email: 254,
  messageMin: 10,
  messageMax: 2000,
} as const;

export type ContactInput = { name: string; email: string; message: string }; // ya con trim

export type ContactField = keyof ContactInput;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: ContactFieldErrors }
  | { status: "success"; name: string }   // nombre para "GRACIAS, {NOMBRE}."
  | { status: "error" };

// Devuelve los errores por campo; objeto vacío si todo es válido.
export function validateContact(input: ContactInput): ContactFieldErrors;
```

Reglas de `validateContact` (mensajes en español y mayúsculas, como el resto de la UI):

| Campo | Regla | Mensaje |
| --- | --- | --- |
| `name` | obligatorio | `ESCRIBE TU NOMBRE` |
| `name` | ≤ 50 | `MÁXIMO 50 CARACTERES` |
| `email` | obligatorio | `ESCRIBE TU CORREO` |
| `email` | ≤ 254 y `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `CORREO NO VÁLIDO` |
| `message` | obligatorio | `ESCRIBE UN MENSAJE` |
| `message` | 10–2000 | `ENTRE 10 Y 2000 CARACTERES` |

En `lib/contact-email.ts`:

```ts
export function buildContactEmail(input: ContactInput, sentAt: Date): {
  subject: string;   // "[Arcade Vault] Nuevo mensaje de px_kai"
  html: string;      // valores escapados (& < > " ')
  text: string;
};
```

Convenciones:

- Los campos del usuario se recortan con `trim` antes de validar y de enviar.
- El asunto elimina saltos de línea del nombre para evitar cabeceras rotas.
- La fecha del correo se formatea con `toLocaleString("es-ES")`.

## Plan de implementación

Antes del paso 1 se invoca `/frontend-design` (obligatorio según CLAUDE.md) para las piezas nuevas que no están en la plantilla: la terminal de error, los errores por campo y el foco del `textarea`. El resto se mantiene fiel a la plantilla.
Antes de escribir la Server Action, usar `useActionState` o `metadata`, se consulta `node_modules/next/dist/docs/` (Server Functions, formularios y variables de entorno).

1. Instalar `resend`. Rellenar `.env.template` con las tres variables y añadir `!.env.template` a `.gitignore`. Verificación: `git status` muestra `.env.template` como nuevo y `.env.local` no aparece.
2. Crear `lib/contact.ts` con `CONTACT_LIMITS`, los tipos y `validateContact`, y `lib/contact-email.ts` con `buildContactEmail`. Verificación: `npx tsc --noEmit` pasa.
3. Crear `app/about/actions.ts` con `sendContactMessage(prev: ContactState, formData: FormData): Promise<ContactState>`: honeypot, validación, lectura de variables, creación del cliente de Resend y envío. Verificación: `npx tsc --noEmit` pasa.
4. Portar a `app/globals.css` las reglas de "Acerca de" de `styles.css` con sus keyframes y media queries, y añadir `.terminal-error`, `.field-error`, la clase del honeypot y las reglas de `reveal` para `.about.reveal-ready`. Sustituir los `transitionDelay` inline por `:nth-child`.
5. Generalizar `components/home/reveal-observer.tsx` con una prop `root` (selector del contenedor, por defecto `".home"`). Verificación: el Home sigue animando igual.
6. Crear `components/about/highlight-icon.tsx` (Server Component, SVG puros) y `app/about/page.tsx` con hero, highlights, divisor, intro de contacto, `<RevealObserver root=".about" />` y `metadata`. El formulario es un placeholder temporal. Verificación: `/about` se ve como la plantilla.
7. Crear `components/about/contact-form.tsx` con los campos controlados, el honeypot, la validación en cliente con `shake`, `useActionState` con `sendContactMessage` y los estados éxito, error y errores por campo. Montarlo en `app/about/page.tsx`.
8. Añadir "Acerca de" a la Nav (barra y panel móvil) y la sección `"about"` en `sectionOf`.
9. Añadir el bloque `@media (prefers-reduced-motion: reduce)` para `reveal`, `shake`, `div-pixels` y `caret`.
10. Verificar con `RESEND_API_KEY` real: un envío llega a `CONTACT_TO_EMAIL`. Verificar sin `RESEND_API_KEY`: aparece la terminal de error. Ejecutar `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores sin `RESEND_API_KEY` definida, y `/about` aparece como ruta estática o parcialmente estática.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/about`.
- [ ] `/about` muestra el kicker "▸ ACERCA DE", el título "ACERCA DE ARCADE VAULT", el texto de misión y 3 highlights con icono pixel.
- [ ] El divisor muestra 24 píxeles y tiene `aria-hidden="true"`.
- [ ] La sección de contacto muestra "CONTÁCTANOS", el subtítulo, 3 tips con LED y el formulario con NOMBRE, CORREO ELECTRÓNICO y MENSAJE.
- [ ] Hacer clic en cada `label` enfoca su campo.
- [ ] Enviar con algún campo vacío hace `shake` y no ejecuta la Server Action (no aparece petición en la pestaña Red).
- [ ] Enviar un mensaje de menos de 10 caracteres muestra `ENTRE 10 Y 2000 CARACTERES` bajo MENSAJE y conserva lo escrito.
- [ ] Enviar el correo `a@b` muestra `CORREO NO VÁLIDO` bajo CORREO ELECTRÓNICO.
- [ ] Con las variables configuradas, un envío válido muestra la terminal verde con "GRACIAS, {NOMBRE}." en mayúsculas, y el correo llega a `CONTACT_TO_EMAIL`.
- [ ] El correo recibido tiene el asunto `[Arcade Vault] Nuevo mensaje de {nombre}`, muestra nombre, correo y mensaje, y "Responder" va al correo del usuario.
- [ ] Un mensaje con `<script>alert(1)</script>` llega como texto visible en el correo, sin ejecutarse ni romper el HTML.
- [ ] "ENVIAR OTRO MENSAJE" muestra el formulario vacío.
- [ ] Sin `RESEND_API_KEY` (o con una inválida), un envío válido muestra la terminal roja con `[ERR] Transmisión fallida.`, y el servidor registra el motivo en consola.
- [ ] "REINTENTAR" vuelve al formulario con el nombre, el correo y el mensaje que se habían escrito.
- [ ] Un envío con el campo `website` relleno muestra la terminal verde y no envía ningún correo.
- [ ] El campo honeypot no es visible, no recibe foco con Tab y no lo anuncian los lectores de pantalla.
- [ ] `RESEND_API_KEY` no aparece en ningún archivo de `.next/static` (`grep -r "re_" .next/static` no encuentra la key).
- [ ] La Nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de", en ese orden, en la barra y en el panel móvil.
- [ ] "Acerca de" está activo solo en `/about`.
- [ ] La pestaña del navegador muestra "Acerca de · Arcade Vault" en `/about`.
- [ ] Al hacer scroll, el divisor y la sección de contacto aparecen con `reveal` una sola vez, y el Home sigue animando igual que antes.
- [ ] Con "reducir movimiento" activo, todo `/about` es visible sin scroll y no hay `shake`, parpadeos ni `reveal`.
- [ ] A 375px de ancho `/about` no genera scroll horizontal de página y el formulario queda debajo de la intro.
- [ ] No queda ningún `style={{}}` inline en los componentes de "Acerca de".
- [ ] `.env.template` está versionado y `.env.local` no.

## Decisiones

- **Sí:** ruta `/about`. Es como el usuario llama a la página y sigue a `/games`. El texto visible sigue siendo "Acerca de".
- **No:** `/acerca`.
- **Sí:** Server Action con `useActionState`. No expone un endpoint público, la API key no sale del servidor y encaja con los formularios de React 19.
- **No:** Route Handler `app/api/contact/route.ts` llamado con `fetch`. No hay otros clientes que lo necesiten.
- **Sí:** un único correo al equipo, con `replyTo` del usuario para responderle desde el cliente de correo. Funciona con el remitente de pruebas `onboarding@resend.dev` sin dominio verificado.
- **No:** acuse de recibo al usuario. Resend no permite enviar a terceros sin dominio verificado.
- **Sí:** HTML y texto plano construidos a mano en `lib/contact-email.ts`. Solo se añade la dependencia `resend`.
- **No:** React Email. Añade dependencias para un correo de cuatro campos.
- **Sí:** validación manual en el servidor con límites, compartida en `lib/contact.ts`. La validación en cliente se queda como en la plantilla (solo campos vacíos con `shake`).
- **No:** Zod. Una dependencia más para seis reglas.
- **Sí:** honeypot como único anti-spam. Cero fricción y sin servicios externos. Ante un bot se responde éxito para no darle pistas.
- **No:** rate limit en memoria. No es fiable en serverless, donde cada instancia tiene su propio estado.
- **Sí:** error de envío como terminal en rojo con "REINTENTAR". Mantiene la estética de la terminal de éxito.
- **No:** mensaje de error bajo el botón.
- **Sí:** al cliente solo llega `{ status: "error" }`. El detalle de Resend se queda en los logs del servidor y no filtra configuración.
- **Sí:** tres variables de entorno (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`) documentadas en `.env.template`. Permite cambiar destinatario y remitente al verificar un dominio sin tocar código. La API key la proporciona el usuario.
- **Sí:** archivo de ejemplo `.env.template` en la raíz en lugar de `.env.example`. Lo decidió el usuario durante la implementación del paso 1 (primero en `specs/`, movido a la raíz tras el paso 4).
- **No:** destinatario y remitente fijos en código.
- **Sí:** cliente de Resend creado dentro de la acción. Así el build no depende de tener la API key.
- **Sí:** enlace "Acerca de" en la Nav. Sin él la página no es accesible desde la UI.
- **No:** prellenar el nombre con `av_user` ni estado de carga en el botón. El usuario los dejó fuera de esta spec.
- **Sí:** reutilizar `reveal-observer` con una prop `root` en lugar de duplicarlo.
- **Sí:** campos controlados en el formulario. React 19 vacía los formularios tras una acción, y "REINTENTAR" y los errores por campo deben conservar lo escrito.
- **Sí:** `label` asociados con `htmlFor`. La plantilla no los asociaba.
- **Sí:** el formulario envía desde `onSubmit` (`preventDefault` + `FormData` construido desde el estado + `startTransition(() => formAction(fd))`) en lugar de `<form action>`. Así React no resetea los campos tras la acción. Decidido durante la implementación del paso 7.
- **Sí:** la acción de `useActionState` envuelve `sendContactMessage` para lanzar el `shake` cuando el servidor devuelve `invalid`, sin efectos. Los resultados cerrados con "ENVIAR OTRO MENSAJE" o "REINTENTAR" se guardan en `dismissed` y se comparan por referencia. Decidido durante la implementación del paso 7.
- **Sí:** errores y terminal de error en magenta (`--magenta`), el color de alerta del tema, en lugar de rojo puro, que no existe en los tokens. Decidido durante la implementación del paso 4.
- **Sí:** reducir movimiento también quita el `fade-in` de la página y el hover de los highlights, como el bloque equivalente del Home. Decidido durante la implementación del paso 9.
- **Sí:** `CONTACT_TO_EMAIL` apunta al correo de la cuenta de Resend. El envío a otra dirección devolvió `403 validation_error` (solo se puede enviar al propio correo sin dominio verificado), lo que de paso verificó la terminal de error con un fallo real. Detectado al verificar el paso 10.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Doble envío por pulsar el botón varias veces (no hay estado de carga) | Se acepta en esta spec. Si ocurre en la práctica, el estado de carga va en una spec propia. |
| React 19 resetea el formulario tras la acción y se pierde lo escrito | Campos controlados con estado local; el `FormData` se construye a partir de ese estado. |
| Sin dominio verificado, Resend solo entrega al correo de la cuenta | `CONTACT_TO_EMAIL` debe ser el correo de la cuenta de Resend. Queda documentado en `.env.template`. |
| `RESEND_API_KEY` ausente rompe el build o se filtra al cliente | El cliente de Resend se crea en la acción (`"use server"`), nunca al importar. Criterio de `grep` sobre `.next/static`. |
| Inyección de HTML en el correo o de cabeceras en el asunto | Escapado de todos los valores en el HTML y eliminación de saltos de línea en el asunto. Criterio con `<script>`. |
| Abuso del formulario para enviar spam al equipo | Honeypot, límites de longitud y un solo destinatario fijo por variable de entorno. |
| Las reglas portadas pisan reglas existentes de `globals.css` | Se busca cada selector antes de pegarlo y se conserva la versión actual si ya existe. |
| Generalizar `reveal-observer` rompe la animación del Home | La prop `root` tiene por defecto `".home"` y hay un criterio de aceptación para el Home. |

## Lo que **no** está en esta spec

- Acuse de recibo al usuario y dominio verificado.
- Rate limiting o CAPTCHA.
- Persistencia de mensajes.
- Prefill con la sesión y estado de carga del botón.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
