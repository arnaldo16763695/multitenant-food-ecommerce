"use client"

import * as React from "react"
import { ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateBranchStorefrontHeroAction } from "@/app/app/[tenantSlug]/admin/branches/actions"
import { uploadCatalogMedia } from "@/lib/catalog/upload-client"
import { getCatalogMediaPathFromUrl } from "@/lib/supabase/storage"

import { BranchStorefrontLinkActions } from "@/components/admin/branch-storefront-link-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type BranchStorefrontItem = {
  readonly id: string
  readonly name: string
  readonly isActive: boolean
  readonly heroImageUrl: string | null
}

type AdminBranchStorefrontSettingsProps = {
  readonly tenantSlug: string
  readonly publicAppUrl: string
  readonly branches: readonly BranchStorefrontItem[]
}

export function AdminBranchStorefrontSettings({ tenantSlug, publicAppUrl, branches }: AdminBranchStorefrontSettingsProps) {
  const router = useRouter()
  const [selectedBranch, setSelectedBranch] = React.useState<BranchStorefrontItem | null>(null)
  const [heroImageUrl, setHeroImageUrl] = React.useState("")
  const [heroPreviewUrl, setHeroPreviewUrl] = React.useState<string | null>(null)
  const [selectedHeroFile, setSelectedHeroFile] = React.useState<File | null>(null)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isSaving, startSaving] = React.useTransition()

  function openDialog(branch: BranchStorefrontItem) {
    setSelectedBranch(branch)
    setHeroImageUrl(branch.heroImageUrl ?? "")
    setHeroPreviewUrl(branch.heroImageUrl ?? null)
    setSelectedHeroFile(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

  function closeDialog() {
    setSelectedBranch(null)
    setHeroImageUrl("")
    setHeroPreviewUrl(null)
    setSelectedHeroFile(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

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

  function clearHeroImage() {
    setSelectedHeroFile(null)
    setHeroImageUrl("")
    setHeroPreviewUrl(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

  function saveBranchHero() {
    if (!selectedBranch) {
      return
    }

    setErrorMessage("")
    setSuccessMessage("")

    startSaving(async () => {
      const formData = new FormData()
      let nextHeroImageUrl = heroImageUrl.trim()

      if (selectedHeroFile) {
        const uploadResult = await uploadCatalogMedia({
          tenantSlug,
          entityType: "branch-hero",
          file: selectedHeroFile,
          entityId: selectedBranch.id,
          previousPath: getCatalogMediaPathFromUrl(heroImageUrl) ?? undefined,
        })

        if (!uploadResult.ok) {
          setErrorMessage(uploadResult.error)
          return
        }

        nextHeroImageUrl = uploadResult.publicUrl ?? ""
      }

      formData.set("heroImageUrl", nextHeroImageUrl)

      const result = await updateBranchStorefrontHeroAction(tenantSlug, selectedBranch.id, formData)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos guardar el hero de la sucursal.")
        return
      }

      setHeroImageUrl(nextHeroImageUrl)
      setHeroPreviewUrl(nextHeroImageUrl || null)
      setSelectedHeroFile(null)
      setSuccessMessage("Hero de sucursal actualizado.")
      router.refresh()
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Links públicos por sucursal</CardTitle>
          <CardDescription>
            Comparte estos enlaces en QR, Google Maps, Instagram o WhatsApp para llevar al cliente directo al storefront correcto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {branches.map((branch) => {
            const storefrontUrl = `${publicAppUrl}/app/${tenantSlug}?branch=${branch.id}`

            return (
              <div key={branch.id} className="grid gap-3 rounded-[1rem] border border-border bg-card p-3.5 lg:grid-cols-[0.95fr_1.15fr_0.9fr]">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">{branch.id}</p>
                    </div>
                    <Badge variant={branch.isActive ? "success" : "warning"}>{branch.isActive ? "Activa" : "Inactiva"}</Badge>
                  </div>
                  <div
                    className="relative min-h-[8.5rem] overflow-hidden rounded-[1rem] border border-stone-200 bg-stone-950 bg-cover bg-center"
                    style={{
                      backgroundImage: branch.heroImageUrl
                        ? `linear-gradient(90deg, rgba(28,25,23,0.86) 0%, rgba(28,25,23,0.42) 100%), url(${branch.heroImageUrl})`
                        : "linear-gradient(135deg, rgba(28,25,23,0.96) 0%, rgba(120,53,15,0.9) 46%, rgba(251,146,60,0.78) 100%)",
                    }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_36%)]" />
                    <div className="relative flex min-h-[8.5rem] flex-col justify-end p-3.5 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Hero actual</p>
                      <p className="mt-1.5 text-base font-semibold">{branch.name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">URL pública</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{storefrontUrl}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hero activo</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {branch.heroImageUrl ? "Esta sucursal usa un hero propio." : "Esta sucursal usa el hero general del tenant como fallback."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <BranchStorefrontLinkActions url={storefrontUrl} />
                  <Button className="h-8 rounded-lg px-3 text-sm" onClick={() => openDialog(branch)} type="button" variant="outline">
                    <ImagePlus />
                    Editar hero
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedBranch)} onOpenChange={(nextOpen) => (!nextOpen ? closeDialog() : undefined)}>
        <DialogContent className="max-w-3xl rounded-[1.25rem]">
          <DialogHeader>
            <DialogTitle>Hero por sucursal</DialogTitle>
            <DialogDescription>
              {selectedBranch
                ? `Configura la portada pública de ${selectedBranch.name}. Si la dejas vacía, el storefront usará el hero general del tenant.`
                : "Configura la portada pública de esta sucursal."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">URL de imagen hero</span>
                <Input
                  value={heroImageUrl}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setHeroImageUrl(nextValue)
                    if (!selectedHeroFile) {
                      setHeroPreviewUrl(nextValue || null)
                    }
                    setErrorMessage("")
                    setSuccessMessage("")
                  }}
                  placeholder="https://..."
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Subir nueva imagen</span>
                <Input accept="image/png,image/jpeg,image/webp" onChange={handleHeroFileChange} type="file" />
              </label>

              {errorMessage ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
              {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}
            </div>

            <div className="space-y-3">
              <div
                className="relative min-h-[16rem] overflow-hidden rounded-[1rem] border border-stone-200 bg-stone-950 bg-cover bg-center"
                style={{
                  backgroundImage: heroPreviewUrl
                    ? `linear-gradient(90deg, rgba(28,25,23,0.88) 0%, rgba(28,25,23,0.5) 100%), url(${heroPreviewUrl})`
                    : "linear-gradient(135deg, rgba(28,25,23,0.96) 0%, rgba(120,53,15,0.9) 46%, rgba(251,146,60,0.78) 100%)",
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.2),_transparent_35%)]" />
                <div className="relative flex min-h-[16rem] flex-col justify-between p-4 text-white">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Branch storefront</span>
                    <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{selectedBranch?.name ?? "Sucursal"}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-200">Preview</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">{selectedBranch?.name ?? "Sucursal"}</h3>
                  </div>
                </div>
              </div>
              <Button
                className="h-8 rounded-lg px-3 text-sm"
                disabled={isSaving || (!heroImageUrl && !selectedHeroFile)}
                onClick={clearHeroImage}
                type="button"
                variant="outline"
              >
                <Trash2 />
                Usar hero general del tenant
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button className="h-8 rounded-lg px-3 text-sm" disabled={isSaving} onClick={saveBranchHero} type="button">
              {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Guardar hero de sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
