"use server";

import { cookies } from "next/headers";

export async function setTheme(theme: "light" | "dark") {
  const c = await cookies();
  c.set("theme", theme, {
    httpOnly: false,
    sameSite: "lax",
    // Only mark secure in production so it works over HTTP in local dev
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
