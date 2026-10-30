import "server-only";

/**
 * Envío de correos. Mientras no haya proveedor configurado (Resend, SES, etc.),
 * el enlace se escribe en el log del servidor para que el dueño lo use.
 */
export async function sendPasswordResetEmail(to: string, link: string) {
  console.info(`[telos:mail] Recuperación de contraseña para ${to}: ${link}`);
}
