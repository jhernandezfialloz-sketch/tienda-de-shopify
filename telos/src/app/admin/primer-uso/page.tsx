import { redirect } from "next/navigation";
import { needsFirstOwner } from "@/server/services/setup";
import { AuthShell } from "@/components/admin/auth-shell";
import { FirstOwnerForm } from "./first-owner-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Primer uso" };

/** Solo existe mientras no hay usuarios. Después redirige al login. */
export default async function FirstUsePage() {
  if (!(await needsFirstOwner())) redirect("/admin/login");
  return (
    <AuthShell title="Configurar TELOS">
      <p className="mb-4 text-sm text-muted">Crea la cuenta del dueño. Este paso solo se puede hacer una vez.</p>
      <FirstOwnerForm />
    </AuthShell>
  );
}
