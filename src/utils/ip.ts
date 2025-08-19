import { Request } from "express";

export function getClientIp(req: Request): string {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
    if (Array.isArray(xff) && xff.length) return xff[0];
    // normaliza IPv6 localhost
    const raw = req.ip ?? "unknown";
    return raw === "::1" ? "127.0.0.1" : raw;
}

export function getUserAgent(req: Request): string {
    // limita para evitar inputs gigantes
    return String(req.headers["user-agent"] ?? "unknown").slice(0, 255);
}