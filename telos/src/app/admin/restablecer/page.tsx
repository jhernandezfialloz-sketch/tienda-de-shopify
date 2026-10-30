import { AuthShell } from "@/components/admin/auth-shell";
import { ResetForm } from "./reset-form";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Nueva contraseña">
      {token ? <ResetForm token={token} /> : <p className="text-sm text-danger">Enlace incompleto. Solicita uno nuevo.</p>}
    </AuthShell>
  );
}
