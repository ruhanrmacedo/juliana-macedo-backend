import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppDataSource } from "../config/ormconfig";
import { User } from "../models/User";
import { Unauthorized, Forbidden } from "../models/anthropometry/calculators/utils/errors";

interface DecodedToken extends JwtPayload {
  id: number;
  email: string;
  role: string;
  name: string;
  authVersion?: number;
}

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    next(new Unauthorized("Token ausente"));
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as DecodedToken;

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: decoded.id },
      select: ["id", "email", "role", "name", "authVersion"],
    });

    if (!user || (decoded.authVersion ?? 0) !== (user.authVersion ?? 0)) {
      throw new Unauthorized("Token inválido ou expirado.");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    next();
  } catch {
    next(new Unauthorized("Token inválido ou expirado."));
  }
};

export const checkRole = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new Forbidden("Acesso negado. Permissão insuficiente."));
      return;
    }
    next();
  };
};
