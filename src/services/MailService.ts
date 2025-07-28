import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const MailService = {
  async sendNewPasswordEmail(to: string, novaSenha: string) {
    const info = await transporter.sendMail({
      from: `"Suporte Juliana Macedo" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Nova senha de acesso",
      text: `Sua nova senha de acesso é: ${novaSenha}`,
      html: `<p>Sua nova senha de acesso é: <strong>${novaSenha}</strong></p>`,
    });

    console.log("E-mail enviado: %s", info.messageId);
  },
};
