import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cream px-6 text-center">
      <h1 className="font-serif text-7xl text-ink">404</h1>
      <Link
        href="/"
        className="rounded-sm bg-bronze px-8 py-3 text-base text-ivory transition-colors hover:bg-bronze/90 sm:text-lg"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
