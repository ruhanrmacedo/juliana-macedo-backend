import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const genericRateLimitMessage = {
  error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: genericRateLimitMessage,
});

export const resetPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: genericRateLimitMessage,
});
