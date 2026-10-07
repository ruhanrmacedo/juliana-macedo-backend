import rateLimit from "express-rate-limit";

export const mediaUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de upload. Tente novamente mais tarde.",
  },
});
