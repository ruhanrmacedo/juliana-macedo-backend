import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Unauthorized, Forbidden } from "../models/anthropometry/calculators/utils/errors";

interface DecodedToken {
  id: number;
  email: string;
  role: string;
  name: string;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) throw new Unauthorized("Token ausente");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name };
    next();
  } catch {
    throw new Unauthorized("Token inválido ou expirado.");

  }
};

export const checkRole = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new Forbidden("Acesso negado. Permissão insuficiente.");
    }
    next();
  };
};