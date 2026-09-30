import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="space-y-4 py-8">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="max-w-2xl text-sm text-muted">
        There is nothing at this address. Run links carry a long random id — a shortened or numbered one names
        nothing.
      </p>
      <div className="flex gap-3 text-sm">
        <Link href="/" className="text-accent hover:underline">
          Demo
        </Link>
        <Link href="/agents" className="text-accent hover:underline">
          Marketplace
        </Link>
        <Link href="/runs" className="text-accent hover:underline">
          Runs
        </Link>
      </div>
    </div>
  );
}
