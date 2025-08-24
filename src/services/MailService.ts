import nodemailer from "nodemailer";

const user = process.env.EMAIL_USER ?? "";
const pass = (process.env.EMAIL_PASS ?? "").replace(/\s+/g, ""); // tira espaços por segurança

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user, pass },
});

(async () => {
  try {
    console.log("[MAIL] user:", user);
    console.log("[MAIL] pass length:", pass.length); // deve ser 16
    await transporter.verify();
    console.log("[MAIL] SMTP OK");
  } catch (err: any) {
    console.error(
      "[MAIL] SMTP FAIL:",
      err?.code,
      err?.response || err?.message
    );
  }
})();

export const MailService = {
  async sendNewPasswordEmail(to: string, novaSenha: string) {
    const info = await transporter.sendMail({
      from: `"Suporte Juliana Macedo" <${user}>`,
      to,
      subject: "Nova senha de acesso",
      text: `Sua nova senha de acesso é: ${novaSenha}`,
      html: `<p>Sua nova senha de acesso é: <strong>${novaSenha}</strong></p>`,
    });
    console.log("E-mail enviado:", info.messageId);
  },
};
