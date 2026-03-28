import { TenantShell } from "@/components/marketing/tenant-shell";

type KitchenPageProps = {
  readonly params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function KitchenPage({ params }: KitchenPageProps) {
  const { tenantSlug } = await params;

  return (
    <TenantShell
      tenantSlug={tenantSlug}
      eyebrow="Kitchen module"
      title={`Kitchen shell para ${tenantSlug}`}
      description="Esta superficie queda reservada para el tablero en tiempo real de preparacion, asignacion y estados operativos por sucursal. La base ya separa claramente operacion y venta."
    />
  );
}
