"use server";

import { Resend } from "resend";
import { validateContact, type ContactState } from "@/lib/contact";
import { buildContactEmail } from "@/lib/contact-email";

const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const input = { name: field(formData, "name"), email: field(formData, "email"), message: field(formData, "message") };

  // Honeypot: bots fill the hidden field. Report success without sending so they get no hint.
  if (field(formData, "website")) return { status: "success", name: input.name };

  const errors = validateContact(input);
  if (Object.keys(errors).length > 0) return { status: "invalid", errors };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;
  if (!apiKey || !to) {
    console.error("[contact] Missing RESEND_API_KEY or CONTACT_TO_EMAIL");
    return { status: "error" };
  }

  // Created here, not at module load, so the build does not need the API key.
  const resend = new Resend(apiKey);
  const { subject, html, text } = buildContactEmail(input, new Date());

  try {
    const { error } = await resend.emails.send({ from, to, replyTo: input.email, subject, html, text });
    if (error) {
      console.error("[contact] Resend rejected the email:", error);
      return { status: "error" };
    }
  } catch (err) {
    console.error("[contact] Resend request failed:", err);
    return { status: "error" };
  }

  return { status: "success", name: input.name };
}
