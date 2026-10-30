import { db } from "@/lib/db";
import { TelosError } from "@/lib/errors";
import type { Actor } from "./permissions";
import { hashPassword, hashToken, randomToken, verifyPassword } from "./password";

export const SESSION_COOKIE = "telos_session";
const SESSION_DAYS = 30;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export interface SessionUser extends Actor {
  email: string;
}

/** Verifica credenciales con bloqueo temporal tras varios intentos fallidos. */
export async function login(email: string, password: string, meta: { userAgent?: string; ip?: string } = {}) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  const generic = new TelosError("UNAUTHENTICATED", "Correo o contraseña incorrectos.");
  if (!user || !user.active) {
    // Igualar tiempo de respuesta para no revelar si el correo existe.
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new TelosError("FORBIDDEN", "Cuenta bloqueada temporalmente por intentos fallidos. Intenta en unos minutos.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    throw generic;
  }
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.$transaction([
    db.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt, userAgent: meta.userAgent, ip: meta.ip } }),
    db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),
    db.auditLog.create({ data: { userId: user.id, action: "auth.login", entityType: "user", entityId: user.id } }),
  ]);
  return { token, expiresAt };
}

export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  // Renovar actividad como máximo una vez por hora.
  if (Date.now() - session.lastSeenAt.getTime() > 3_600_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  const { user } = session;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function logout(token: string | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Crea un token de recuperación (1 hora). Devuelve null si el correo no existe (no se revela). */
export async function createPasswordReset(email: string): Promise<{ token: string; userId: string } | null> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active) return null;
  const token = randomToken();
  await db.passwordResetToken.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return { token, userId: user.id };
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new TelosError("VALIDATION", "El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Cerrar todas las sesiones abiertas tras cambiar la contraseña.
    db.session.deleteMany({ where: { userId: record.userId } }),
    db.auditLog.create({ data: { userId: record.userId, action: "auth.password_reset", entityType: "user", entityId: record.userId } }),
  ]);
}
