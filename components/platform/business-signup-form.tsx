"use client"

import * as React from "react"
import { Building2, LoaderCircle, Send } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createBusinessSignupAction } from "@/app/signup/business/actions"

export function BusinessSignupForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = React.useState("")
  const [ownerFullName, setOwnerFullName] = React.useState("")
  const [ownerEmail, setOwnerEmail] = React.useState("")
  const [ownerPhone, setOwnerPhone] = React.useState("")
  const [slugRequested, setSlugRequested] = React.useState("")
  const [businessType, setBusinessType] = React.useState("")
  const [branchCountEstimate, setBranchCountEstimate] = React.useState("1")
  const [notes, setNotes] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    const result = await createBusinessSignupAction({
      companyName,
      ownerFullName,
      ownerEmail,
      ownerPhone,
      slugRequested,
      businessType,
      branchCountEstimate,
      notes,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? "No pudimos registrar la solicitud.")
      setIsSubmitting(false)
      return
    }

    router.replace("/signup/business/success")
    router.refresh()
  }

  return (
    <Card className="border-stone-200 bg-white/90 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Building2 className="size-5 text-orange-700" />
          Registro de empresa
        </CardTitle>
        <CardDescription>
          Crea una solicitud para dar de alta tu negocio en la plataforma. Luego puedes pasar a un onboarding guiado o a aprobacion manual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Empresa</span>
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ej. Demo Brand" required />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Responsable</span>
              <Input value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} placeholder="Ej. Ana Torres" required />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Email</span>
              <Input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="owner@empresa.com" required />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Telefono</span>
              <Input value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} placeholder="+58..." />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Slug solicitado</span>
              <Input value={slugRequested} onChange={(event) => setSlugRequested(event.target.value)} placeholder="mi-marca" required />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Sucursales estimadas</span>
              <Input type="number" min="1" value={branchCountEstimate} onChange={(event) => setBranchCountEstimate(event.target.value)} />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Tipo de negocio</span>
            <Input value={businessType} onChange={(event) => setBusinessType(event.target.value)} placeholder="Ej. fast food, cafe, dark kitchen" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Notas</span>
            <textarea
              className="min-h-28 rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Cuentanos que necesitas, ciudad, volumen estimado o cualquier contexto comercial."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

          <Button className="h-10 rounded-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Send />}
            {isSubmitting ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
