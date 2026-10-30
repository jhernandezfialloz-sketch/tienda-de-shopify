import { AuthShell } from "@/components/admin/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ restablecida?: string }> }) {
  const { restablecida } = await searchParams;
  return (
    <AuthShell title="Iniciar sesión">
      {restablecida && <p className="mb-4 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">Contraseña actualizada. Ya puedes entrar.</p>}
      <LoginForm />
    </AuthShell>
  );
}
