function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getMongoUri(): string {
  return readRequiredEnv("MONGO_URI");
}

export function getFrontendUrl(): string {
  return readRequiredEnv("FRONTEND_URL");
}

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  getMongoUri();
  readRequiredEnv("JWT_SECRET");
  getFrontendUrl();
}
