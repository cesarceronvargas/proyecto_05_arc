// Contact form shared between the client form and the sendContactMessage Server Action.

export const CONTACT_LIMITS = {
  name: 50,
  email: 254,
  messageMin: 10,
  messageMax: 2000,
} as const;

export type ContactInput = { name: string; email: string; message: string }; // already trimmed

export type ContactField = keyof ContactInput;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: ContactFieldErrors }
  | { status: "success"; name: string } // name for "GRACIAS, {NOMBRE}."
  | { status: "error" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns the errors per field; an empty object when everything is valid.
export function validateContact({ name, email, message }: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (!name) errors.name = "ESCRIBE TU NOMBRE";
  else if (name.length > CONTACT_LIMITS.name) errors.name = `MÁXIMO ${CONTACT_LIMITS.name} CARACTERES`;

  if (!email) errors.email = "ESCRIBE TU CORREO";
  else if (email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(email)) errors.email = "CORREO NO VÁLIDO";

  if (!message) errors.message = "ESCRIBE UN MENSAJE";
  else if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    errors.message = `ENTRE ${CONTACT_LIMITS.messageMin} Y ${CONTACT_LIMITS.messageMax} CARACTERES`;
  }

  return errors;
}
