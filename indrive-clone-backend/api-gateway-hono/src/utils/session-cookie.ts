import type { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { config } from "../config.js";

// The JWT lives in an HttpOnly cookie so client-side JS (and any XSS) cannot
// read it. The browser attaches it automatically to same-site REST calls and
// to the WebSocket handshake; the gateway and realtime service read it back.
export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, config.cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: config.cookieMaxAgeSeconds,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, config.cookieName, { path: "/" });
}
