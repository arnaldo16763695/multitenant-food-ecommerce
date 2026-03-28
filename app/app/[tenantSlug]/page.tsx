import { TenantShell } from "@/components/marketing/tenant-shell";

type TenantPageProps = {
  readonly params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenantSlug } = await params;

  return (
    <TenantShell
      tenantSlug={tenantSlug}
      eyebrow="Tenant storefront"
      title={`Storefront base para ${tenantSlug}`}
      description="Este shell separa la vista publica por marca y deja listo el siguiente paso: conectar branch selection, menu por sucursal y checkout sobre Supabase."
    />
  );
}
