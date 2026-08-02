"use client"

import * as React from "react"
import { LoaderCircle, Save, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { deletePlatformMobileHomeBannerAction, savePlatformMobileHomeBannerAction } from "@/app/platform/home-banners/actions"
import type { PlatformMobileHomeBannerOption, PlatformMobileHomeBannerSummary } from "@/lib/domain/platform-admin"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PlatformMobileHomeBannersProps = {
  readonly banners: readonly PlatformMobileHomeBannerSummary[]
  readonly options: readonly PlatformMobileHomeBannerOption[]
}

type BannerFormValues = {
  readonly bannerId?: string
  readonly tenantId: string
  readonly branchId: string
  readonly title: string
  readonly subtitle: string
  readonly imageUrl: string
  readonly ctaLabel: string
  readonly sortOrder: string
  readonly isActive: boolean
  readonly startsAt: string
  readonly endsAt: string
}

function toLocalDateTimeInputValue(value: string | null) {
  if (!value) {
    return ""
  }

  return value.slice(0, 16)
}

function buildBannerFormValues(banner?: PlatformMobileHomeBannerSummary): BannerFormValues {
  return {
    bannerId: banner?.id,
    tenantId: banner?.tenantId ?? "",
    branchId: banner?.branchId ?? "",
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    imageUrl: banner?.imageUrl ?? "",
    ctaLabel: banner?.ctaLabel ?? "Abrir tienda",
    sortOrder: String(banner?.sortOrder ?? 0),
    isActive: banner?.isActive ?? true,
    startsAt: toLocalDateTimeInputValue(banner?.startsAt ?? null),
    endsAt: toLocalDateTimeInputValue(banner?.endsAt ?? null),
  }
}

function BannerEditor({
  title,
  description,
  values,
  options,
  onDelete,
}: {
  readonly title: string
  readonly description: string
  readonly values: BannerFormValues
  readonly options: readonly PlatformMobileHomeBannerOption[]
  readonly onDelete?: () => Promise<void>
}) {
  const router = useRouter()
  const [formValues, setFormValues] = React.useState<BannerFormValues>(values)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const selectedTenant = options.find((option) => option.tenantId === formValues.tenantId) ?? null

  function updateField<K extends keyof BannerFormValues>(field: K, value: BannerFormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "tenantId" ? { branchId: "" } : null),
    }))
    setErrorMessage("")
    setSuccessMessage("")
  }

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData()

      if (formValues.bannerId) {
        formData.set("bannerId", formValues.bannerId)
      }

      formData.set("tenantId", formValues.tenantId)
      formData.set("branchId", formValues.branchId)
      formData.set("title", formValues.title)
      formData.set("subtitle", formValues.subtitle)
      formData.set("imageUrl", formValues.imageUrl)
      formData.set("ctaLabel", formValues.ctaLabel)
      formData.set("sortOrder", formValues.sortOrder)
      formData.set("isActive", String(formValues.isActive))
      formData.set("startsAt", formValues.startsAt ? new Date(formValues.startsAt).toISOString() : "")
      formData.set("endsAt", formValues.endsAt ? new Date(formValues.endsAt).toISOString() : "")

      const result = await savePlatformMobileHomeBannerAction(formData)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos guardar el banner mobile.")
        return
      }

      setSuccessMessage("Banner guardado.")
      router.refresh()
    })
  }

  function handleDelete() {
    if (!onDelete) {
      return
    }

    startTransition(async () => {
      await onDelete()
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Tenant</span>
            <select
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none"
              value={formValues.tenantId}
              onChange={(event) => updateField("tenantId", event.target.value)}
            >
              <option value="">Selecciona un tenant</option>
              {options.map((option) => (
                <option key={option.tenantId} value={option.tenantId}>{option.tenantName}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Sucursal opcional</span>
            <select
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none"
              value={formValues.branchId}
              onChange={(event) => updateField("branchId", event.target.value)}
            >
              <option value="">Banner por marca</option>
              {(selectedTenant?.branches ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Titulo</span>
            <Input value={formValues.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Combos cerca de ti" />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">CTA</span>
            <Input value={formValues.ctaLabel} onChange={(event) => updateField("ctaLabel", event.target.value)} placeholder="Abrir tienda" />
          </label>
        </div>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Subtitulo</span>
          <textarea
            className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
            value={formValues.subtitle}
            onChange={(event) => updateField("subtitle", event.target.value)}
            placeholder="Muestra la sucursal correcta y empuja la compra mobile."
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Imagen URL</span>
          <Input value={formValues.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} placeholder="https://..." />
        </label>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Orden</span>
            <Input value={formValues.sortOrder} onChange={(event) => updateField("sortOrder", event.target.value)} inputMode="numeric" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-1">
            <span className="font-medium text-foreground">Inicio</span>
            <Input type="datetime-local" value={formValues.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm md:col-span-1">
            <span className="font-medium text-foreground">Fin</span>
            <Input type="datetime-local" value={formValues.endsAt} onChange={(event) => updateField("endsAt", event.target.value)} />
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" checked={formValues.isActive} onChange={(event) => updateField("isActive", event.target.checked)} />
            <span className="font-medium text-foreground">Activo</span>
          </label>
        </div>

        {errorMessage ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
        {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={formValues.isActive ? "success" : "outline"}>{formValues.isActive ? "Activo" : "Inactivo"}</Badge>
            {selectedTenant ? <span className="text-sm text-muted-foreground">/{selectedTenant.tenantSlug}</span> : null}
          </div>
          <div className="flex gap-2">
            {onDelete ? (
              <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-sm" disabled={isPending} onClick={handleDelete}>
                <Trash2 />
                Eliminar
              </Button>
            ) : null}
            <Button type="button" className="h-9 rounded-lg px-3 text-sm" disabled={isPending} onClick={handleSave}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
              Guardar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PlatformMobileHomeBanners({ banners, options }: PlatformMobileHomeBannersProps) {
  async function deleteBanner(bannerId: string) {
    const result = await deletePlatformMobileHomeBannerAction(bannerId)
    if (!result.ok) {
      throw new Error(result.error ?? "No pudimos eliminar el banner mobile.")
    }
  }

  return (
    <section className="grid gap-6">
      <BannerEditor
        title="Nuevo banner"
        description="Crea un banner manual para la home mobile. Si seleccionas una sucursal, el CTA abrira ese storefront puntual."
        values={buildBannerFormValues()}
        options={options}
      />

      <div className="grid gap-4">
        {banners.map((banner) => (
          <BannerEditor
            key={banner.id}
            title={banner.title}
            description={`${banner.tenantName}${banner.branchName ? ` · ${banner.branchName}` : " · Banner por marca"}`}
            values={buildBannerFormValues(banner)}
            options={options}
            onDelete={() => deleteBanner(banner.id)}
          />
        ))}
      </div>
    </section>
  )
}
