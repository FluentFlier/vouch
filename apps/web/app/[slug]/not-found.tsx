import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <main className="min-h-screen bg-vouch-bg flex flex-col items-center justify-center">
      <span className="font-mono text-vouch-text text-8xl font-bold">404</span>
      <p className="text-vouch-muted mt-4 text-sm">
        This project isn&apos;t on Vouch yet.
      </p>
      <Link
        href="/"
        className="mt-8 text-vouch-green text-sm hover:underline"
      >
        Go to vouch.run
      </Link>
    </main>
  );
}
