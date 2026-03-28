import { TenantShell } from "@/components/marketing/tenant-shell";

type AdminPageProps = {
  readonly params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { tenantSlug } = await params;

  return (
    <TenantShell
      tenantSlug={tenantSlug}
      eyebrow="Admin module"
      title={`Admin shell para ${tenantSlug}`}
      description="La siguiente iteracion aqui debe entrar a gestion de catalogo, sucursales, disponibilidad y roles. Por ahora dejamos la superficie separada para no mezclar concerns desde el inicio."
    />
  );
}
