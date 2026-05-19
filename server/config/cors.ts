import type { CorsOptions } from "cors";
import { getFrontendUrl } from "./env";

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

export function getAllowedOrigins(): string[] {
  const configuredOrigins = (process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === "production") {
    return [normalizeOrigin(getFrontendUrl())];
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_ORIGINS;
  }

  return [];
}

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(normalizeOrigin(origin));
}

export function createCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin ?? "unknown"}`));
    },
    credentials: true,
  };
}
