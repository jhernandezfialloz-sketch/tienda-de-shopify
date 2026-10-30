import Link from "next/link";

// Sitio público: se construye en la Fase 3 (home, catálogo, fichas). Por ahora, la marca.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-between px-6 py-10">
      <header className="flex items-center justify-between text-sm text-muted">
        <span>Distribuidora Telos</span>
        <span>Honduras</span>
      </header>
      <section>
        <h1 className="text-[clamp(4rem,18vw,13rem)] font-semibold leading-none tracking-[var(--tracking-brand)]">TELOS</h1>
        <p className="mt-6 max-w-md text-lg text-ink-2">Moda masculina. Catálogo en línea muy pronto.</p>
      </section>
      <footer className="flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
        <span>© {new Date().getFullYear()} Distribuidora Telos</span>
        <Link href="/admin" className="hover:text-ink">Telos Admin</Link>
      </footer>
    </main>
  );
}
