import { NextFunction, Request, Response } from "express";

const SENSITIVE_RESPONSE_KEYS = new Set([
  "password",
  "passwordhash",
  "hashedpassword",
  "tokenhash",
]);

function normalizeResponseKey(key: string): string {
  return key.replace(/[_-]/g, "").toLowerCase();
}

export function sanitizeResponseBody(
  value: unknown,
  seen = new WeakMap<object, unknown>()
): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;

  const existing = seen.get(value);
  if (existing) return existing;

  if (Array.isArray(value)) {
    const sanitizedArray: unknown[] = [];
    seen.set(value, sanitizedArray);
    for (const item of value) {
      sanitizedArray.push(sanitizeResponseBody(item, seen));
    }
    return sanitizedArray;
  }

  const sanitizedObject: Record<string, unknown> = {};
  seen.set(value, sanitizedObject);

  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_RESPONSE_KEYS.has(normalizeResponseKey(key))) continue;
    sanitizedObject[key] = sanitizeResponseBody(item, seen);
  }

  return sanitizedObject;
}

export function responseSanitizer(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) =>
    originalJson(sanitizeResponseBody(body))) as Response["json"];

  next();
}
