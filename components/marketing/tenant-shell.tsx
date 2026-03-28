import Link from "next/link";

type TenantShellProps = {
  readonly tenantSlug: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
};

export function TenantShell({ tenantSlug, title, eyebrow, description }: TenantShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-700">{eyebrow}</p>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-950">{title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
              href="/brands"
            >
              Marketplace
            </Link>
            <Link
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
              href={`/app/${tenantSlug}`}
            >
              Storefront
            </Link>
            <Link
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
              href={`/app/${tenantSlug}/admin`}
            >
              Admin
            </Link>
            <Link
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
              href={`/app/${tenantSlug}/kitchen`}
            >
              Kitchen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
