import "express";

declare module "express-serve-static-core" {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    user?: {
      id: number;
      email?: string;
      role: string;
      name?: string;
    };
  }
}
