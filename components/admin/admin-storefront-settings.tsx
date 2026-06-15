"use client"

import * as React from "react"
import { ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateStorefrontBrandingAction } from "@/app/app/[tenantSlug]/admin/settings/actions"
import { TenantBrandMark } from "@/components/branding/tenant-brand-mark"
import { uploadCatalogMedia } from "@/lib/catalog/upload-client"
import { getCatalogMediaPathFromUrl } from "@/lib/supabase/storage"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type AdminStorefrontSettingsProps = {
  readonly tenantSlug: string
  readonly tenantName: string
  readonly initialStorefrontEnabled: boolean
  readonly initialHeroImageUrl: string | null
  readonly initialLogoImageUrl: string | null
}

export function AdminStorefrontSettings({
  tenantSlug,
  tenantName,
  initialStorefrontEnabled,
  initialHeroImageUrl,
  initialLogoImageUrl,
}: AdminStorefrontSettingsProps) {
  const router = useRouter()
  const [storefrontEnabled, setStorefrontEnabled] = React.useState(initialStorefrontEnabled)
  const [selectedHeroFile, setSelectedHeroFile] = React.useState<File | null>(null)
  const [heroImageUrl, setHeroImageUrl] = React.useState(initialHeroImageUrl ?? "")
  const [heroPreviewUrl, setHeroPreviewUrl] = React.useState(initialHeroImageUrl)
  const [selectedLogoFile, setSelectedLogoFile] = React.useState<File | null>(null)
  const [logoImageUrl, setLogoImageUrl] = React.useState(initialLogoImageUrl ?? "")
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState(initialLogoImageUrl)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isSaving, startSaving] = React.useTransition()

  function handleHeroFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedHeroFile(file)
    setErrorMessage("")
    setSuccessMessage("")

    if (!file) {
      setHeroPreviewUrl(heroImageUrl || null)
      return
    }

    setHeroPreviewUrl(URL.createObjectURL(file))
  }

  function handleLogoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedLogoFile(file)
    setErrorMessage("")
    setSuccessMessage("")

    if (!file) {
      setLogoPreviewUrl(logoImageUrl || null)
      return
    }

    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  function clearHeroImage() {
    setSelectedHeroFile(null)
    setHeroImageUrl("")
    setHeroPreviewUrl(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

  function clearLogoImage() {
    setSelectedLogoFile(null)
    setLogoImageUrl("")
    setLogoPreviewUrl(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

  function saveSettings() {
    setErrorMessage("")
    setSuccessMessage("")

    startSaving(async () => {
      const formData = new FormData()
      let nextHeroImageUrl = heroImageUrl.trim()
      let nextLogoImageUrl = logoImageUrl.trim()

      if (selectedHeroFile) {
        const uploadResult = await uploadCatalogMedia({
          tenantSlug,
          entityType: "tenant-hero",
          file: selectedHeroFile,
          previousPath: getCatalogMediaPathFromUrl(heroImageUrl) ?? undefined,
        })

        if (!uploadResult.ok) {
          setErrorMessage(uploadResult.error)
          return
        }

        nextHeroImageUrl = uploadResult.publicUrl ?? ""
      }

      if (selectedLogoFile) {
        const uploadResult = await uploadCatalogMedia({
          tenantSlug,
          entityType: "tenant-logo",
          file: selectedLogoFile,
          previousPath: getCatalogMediaPathFromUrl(logoImageUrl) ?? undefined,
        })

        if (!uploadResult.ok) {
          setErrorMessage(uploadResult.error)
          return
        }

        nextLogoImageUrl = uploadResult.publicUrl ?? ""
      }

      formData.set("storefrontEnabled", storefrontEnabled ? "true" : "false")
      formData.set("heroImageUrl", nextHeroImageUrl)
      formData.set("logoImageUrl", nextLogoImageUrl)

      const result = await updateStorefrontBrandingAction(tenantSlug, formData)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos guardar la configuración del storefront.")
        return
      }

      setHeroImageUrl(nextHeroImageUrl)
      setHeroPreviewUrl(nextHeroImageUrl || null)
      setSelectedHeroFile(null)
      setLogoImageUrl(nextLogoImageUrl)
      setLogoPreviewUrl(nextLogoImageUrl || null)
      setSelectedLogoFile(null)
      setSuccessMessage("Storefront actualizado.")
      router.refresh()
    })
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Branding del storefront</CardTitle>
          <CardDescription>
            Controla si la tienda pública está visible y define el hero principal y el logo que verán tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex items-center justify-between rounded-[1.25rem] border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Storefront público</p>
              <p className="text-sm text-muted-foreground">Activa o pausa la entrada pública del tenant sin tocar el admin interno.</p>
            </div>
            <Switch checked={storefrontEnabled} onCheckedChange={setStorefrontEnabled} />
          </div>

          <div className="grid gap-3 rounded-[1.25rem] border border-border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Logo de marca</p>
              <p className="text-sm text-muted-foreground">Se usará en cabeceras y superficies públicas de la marca.</p>
            </div>
            <div className="flex items-center gap-3">
              <TenantBrandMark name={tenantName} logoImageUrl={logoPreviewUrl} size="lg" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-card-foreground">Recomendado</p>
                <p>PNG o WEBP con fondo transparente, en formato cuadrado u horizontal.</p>
              </div>
            </div>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Subir logo</span>
              <Input accept="image/png,image/jpeg,image/webp" onChange={handleLogoFileChange} type="file" />
            </label>
            <div>
              <Button className="rounded-xl" disabled={isSaving || (!logoImageUrl && !selectedLogoFile)} onClick={clearLogoImage} type="button" variant="outline">
                <Trash2 />
                Quitar logo
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.25rem] border border-border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Hero principal</p>
              <p className="text-sm text-muted-foreground">Esta imagen se guardará en Supabase Storage y se usará como portada general de la marca.</p>
            </div>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Subir nueva imagen</span>
              <Input accept="image/png,image/jpeg,image/webp" onChange={handleHeroFileChange} type="file" />
            </label>
            <div>
              <Button className="rounded-xl" disabled={isSaving || (!heroImageUrl && !selectedHeroFile)} onClick={clearHeroImage} type="button" variant="outline">
                <Trash2 />
                Limpiar hero
              </Button>
            </div>
          </div>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
          {successMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-xl" disabled={isSaving} onClick={saveSettings} type="button">
              {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Guardar storefront
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Preview hero</CardTitle>
          <CardDescription>Vista rápida del primer impacto visual que recibirá el cliente en el storefront público.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div
            className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-stone-950/10 bg-stone-950 bg-cover bg-center"
            style={{
              backgroundImage: heroPreviewUrl
                ? `linear-gradient(90deg, rgba(28,25,23,0.88) 0%, rgba(28,25,23,0.58) 40%, rgba(28,25,23,0.18) 100%), url(${heroPreviewUrl})`
                : "linear-gradient(135deg, rgba(28,25,23,0.96) 0%, rgba(120,53,15,0.9) 46%, rgba(251,146,60,0.78) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_35%)]" />
            <div className="relative flex min-h-[22rem] flex-col justify-between p-6 text-white">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Public storefront</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{storefrontEnabled ? "Activo" : "Oculto"}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <TenantBrandMark name={tenantName} logoImageUrl={logoPreviewUrl} size="md" className="border-white/15 bg-white" />
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-200">{tenantName}</p>
                </div>
                <h3 className="max-w-xl text-4xl font-semibold tracking-tight">Hero comercial con imagen propia de la marca.</h3>
                <p className="max-w-lg text-sm leading-7 text-stone-200">
                  Este bloque es el que posiciona visualmente la sucursal y prepara el contexto antes de mostrar el menú.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-dashed border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <ImagePlus className="mt-0.5 size-4 text-orange-700" />
              <p>
                Estado actual:
                {" "}
                <span className="font-semibold text-card-foreground">
                  {heroPreviewUrl ? "el storefront usará una imagen hero personalizada" : "el storefront usará el gradiente por defecto"}
                </span>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
