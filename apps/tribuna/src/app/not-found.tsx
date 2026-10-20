import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-md place-items-center px-6 py-32 text-center">
      <p className="font-display text-6xl font-semibold tracking-tight text-ink-3">404</p>
      <p className="mt-3 text-[15px] text-ink-2">Esta página no existe.</p>
      <Link href="/" className="mt-6 rounded-full bg-ink px-5 py-2 text-[14px] font-medium text-surface transition active:scale-95">
        Volver al inicio
      </Link>
    </main>
  );
}
