import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/auth-shell";
import { needsFirstOwner } from "@/server/services/setup";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ restablecida?: string }> }) {
  if (await needsFirstOwner()) redirect("/admin/primer-uso");
  const { restablecida } = await searchParams;
  return (
    <AuthShell title="Iniciar sesión">
      {restablecida && <p className="mb-4 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">Contraseña actualizada. Ya puedes entrar.</p>}
      <LoginForm />
    </AuthShell>
  );
}
