import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { IsNull, MoreThan } from "typeorm";
import { AppDataSource } from "../config/ormconfig";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { User } from "../models/User";
import { MailService, PasswordResetEmailSender } from "./MailService";
import { assertValidPassword } from "../utils/passwordPolicy";

const TOKEN_TTL_MINUTES = 30;
const GENERIC_RESPONSE = {
  message:
    "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

export class PasswordResetService {
  static readonly tokenTtlMinutes = TOKEN_TTL_MINUTES;
  static readonly genericResponse = GENERIC_RESPONSE;

  static async requestReset(
    email: string,
    sendEmail: PasswordResetEmailSender = MailService.sendPasswordResetEmail
  ) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return GENERIC_RESPONSE;

    const tokenRepository = AppDataSource.getRepository(PasswordResetToken);
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000);

    const resetToken = await AppDataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder("user")
        .setLock("pessimistic_write")
        .where("LOWER(user.email) = :email", { email: normalizedEmail })
        .getOne();

      if (!user) return null;

      await manager.update(
        PasswordResetToken,
        {
          userId: user.id,
          usedAt: IsNull(),
          invalidatedAt: IsNull(),
          expiresAt: MoreThan(now),
        },
        { invalidatedAt: now }
      );

      return manager.save(
        manager.create(PasswordResetToken, {
          userId: user.id,
          user,
          tokenHash,
          expiresAt,
        })
      );
    });

    if (!resetToken) return GENERIC_RESPONSE;

    const resetUrl = `${getFrontendUrl()}/reset-password#token=${encodeURIComponent(rawToken)}`;

    try {
      await sendEmail({
        to: resetToken.user.email,
        resetUrl,
        expiresInMinutes: TOKEN_TTL_MINUTES,
      });
    } catch {
      await tokenRepository.update(
        { id: resetToken.id, usedAt: IsNull(), invalidatedAt: IsNull() },
        { invalidatedAt: new Date() }
      );
      console.error("[MAIL] Falha ao enviar e-mail de recuperação de senha");
    }

    return GENERIC_RESPONSE;
  }

  static async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new Error("Token inválido ou expirado");
    }

    assertValidPassword(newPassword);

    const tokenHash = hashToken(rawToken);

    await AppDataSource.transaction(async (manager) => {
      const resetToken = await manager
        .getRepository(PasswordResetToken)
        .createQueryBuilder("token")
        .setLock("pessimistic_write")
        .innerJoinAndSelect("token.user", "user")
        .where("token.tokenHash = :tokenHash", { tokenHash })
        .getOne();

      const now = new Date();
      if (
        !resetToken ||
        !resetToken.user ||
        resetToken.usedAt ||
        resetToken.invalidatedAt ||
        resetToken.expiresAt.getTime() <= now.getTime()
      ) {
        throw new Error("Token inválido ou expirado");
      }

      const user = resetToken.user;
      user.password = await bcrypt.hash(newPassword, 10);
      user.authVersion = (user.authVersion ?? 0) + 1;
      resetToken.usedAt = now;

      await manager.save(User, user);
      await manager.save(PasswordResetToken, resetToken);

      await manager.update(
        PasswordResetToken,
        {
          userId: user.id,
          usedAt: IsNull(),
          invalidatedAt: IsNull(),
        },
        { invalidatedAt: now }
      );
    });
  }
}
