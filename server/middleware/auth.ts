import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@shared/api";
import { getJwtSecret } from "../services/auth.service";

export interface AuthUserPayload {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUserPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { userId: string; role: UserRole };
    req.authUser = { id: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!allowed.includes(req.authUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
