import { Request, Response } from "express";
import { PasswordResetService } from "../services/PasswordResetService";
import { getPasswordPolicyError } from "../utils/passwordPolicy";

export class PasswordResetController {
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body ?? {};
      const result = await PasswordResetService.requestReset(email);
      res.status(202).json(result);
    } catch {
      console.error("[PASSWORD_RESET] Falha ao processar solicitação");
      res.status(503).json(PasswordResetService.genericResponse);
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body ?? {};

      if (!token || !newPassword || !confirmPassword) {
        res.status(400).json({ error: "Todos os campos são obrigatórios." });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: "A confirmação da nova senha não confere." });
        return;
      }

      const passwordPolicyError = getPasswordPolicyError(newPassword);
      if (passwordPolicyError) {
        res.status(400).json({ error: passwordPolicyError });
        return;
      }

      await PasswordResetService.resetPassword(token, newPassword);
      res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch {
      res.status(400).json({ error: "Token inválido ou expirado." });
    }
  }
}
