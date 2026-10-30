"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { toTelosError } from "@/lib/errors";
import { createPasswordReset, login, logout, resetPassword, SESSION_COOKIE } from "@/server/auth/sessions";
import { sendPasswordResetEmail } from "@/server/mail";

export async function loginAction(_: unknown, form: FormData) {
  const h = await headers();
  try {
    const { token, expiresAt } = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""), {
      userAgent: h.get("user-agent") ?? undefined,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  } catch (err) {
    return { error: toTelosError(err).message };
  }
  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  await logout(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function requestResetAction(_: unknown, form: FormData) {
  const result = await createPasswordReset(String(form.get("email") ?? ""));
  if (result) {
    const base = process.env.APP_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail(String(form.get("email")), `${base}/admin/restablecer?token=${result.token}`);
  }
  // Mismo mensaje exista o no el correo (no revelar cuentas).
  return { message: "Si el correo está registrado, recibirás un enlace válido por 1 hora." };
}

export async function resetPasswordAction(_: unknown, form: FormData) {
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) return { error: "Las contraseñas no coinciden." };
  try {
    await resetPassword(String(form.get("token") ?? ""), password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo cambiar la contraseña." };
  }
  redirect("/admin/login?restablecida=1");
}
