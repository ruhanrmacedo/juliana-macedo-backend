import axios from "axios";
import qs from "qs";
import type { Request } from "express";

/**
 * Verifica o reCAPTCHA. Em dev, você pode desativar com RECAPTCHA_REQUIRED=false
 * ou usar o header x-bypass-recaptcha com a chave DEV_BYPASS_KEY.
 */
export async function verifyRecaptcha(token?: string, req?: Request): Promise<boolean> {
    const required = process.env.RECAPTCHA_REQUIRED === "true"; // default: false em dev

    // BYPASS (somente fora de produção)
    if (process.env.NODE_ENV !== "production") {
        const bypassKey = process.env.DEV_BYPASS_KEY;
        const header = req?.header("x-bypass-recaptcha");
        if (!required) return true;                 // flag global para pular em dev
        if (bypassKey && header === bypassKey) return true; // bypass por header no Postman
    }

    if (!required) return true; // segurança extra

    if (!token) return false;

    const secret = process.env.RECAPTCHA_SECRET_KEY!;
    const resp = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        qs.stringify({ secret, response: token }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return !!resp.data?.success;
}