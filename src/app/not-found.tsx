import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="contenido"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-base px-screen text-center"
    >
      <p className="font-mono text-kpi font-semibold text-fg-mute">404</p>
      <p className="font-sans text-body text-fg-secondary">
        No encontramos esa página o ese incendio.
      </p>
      <Link href="/" className="font-sans text-body font-semibold text-action-text">
        Volver al mapa
      </Link>
    </main>
  );
}
