"use server";

import { cookies } from "next/headers";

export async function setTheme(theme: "light" | "dark") {
  const c = await cookies();
  c.set("theme", theme, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
