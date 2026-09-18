import axios from "axios";

export interface PasswordResetEmail { to: string; resetUrl: string; expiresInMinutes: number; }
export type PasswordResetEmailSender = (message: PasswordResetEmail) => Promise<void>;

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;

function escapeHtml(value: string): string { return value.replace(/[&<>\u0022\u0027]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\u0022": "&quot;", "\u0027": "&#039;" })[character]!); }

const sendPasswordResetEmail: PasswordResetEmailSender = async ({ to, resetUrl, expiresInMinutes }) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Resend email provider is not configured");
  const safeResetUrl = escapeHtml(resetUrl);
  await axios.post(RESEND_EMAILS_URL, {
    from, to: [to], subject: "Redefinição de senha - Vida & Sabor",
    text: ["Recebemos uma solicitação para redefinir sua senha no Vida & Sabor.", "Acesse o link a seguir em até " + expiresInMinutes + " minutos:", resetUrl, "", "Se você não solicitou a redefinição, ignore este e-mail."].join("\n"),
    html: ["<div style=\"font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;\">", "<h1 style=\"color: #15803d; font-size: 24px;\">Redefinição de senha</h1>", "<p>Recebemos uma solicitação para redefinir sua senha no Vida &amp; Sabor.</p>", "<p><a href=\"" + safeResetUrl + "\" style=\"display: inline-block; padding: 12px 20px; border-radius: 6px; background: #15803d; color: #ffffff; text-decoration: none; font-weight: bold;\">Redefinir minha senha</a></p>", "<p>Este link expira em " + expiresInMinutes + " minutos e pode ser usado apenas uma vez.</p>", "<p>Se você não solicitou a redefinição, ignore este e-mail.</p>", "</div>"].join(""),
  }, { headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, timeout: RESEND_TIMEOUT_MS });
};

export const MailService = { sendPasswordResetEmail };
