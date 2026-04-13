"use client"

import * as React from "react"
import { Check, Copy, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"

type BranchStorefrontLinkActionsProps = {
  readonly url: string
}

export function BranchStorefrontLinkActions({ url }: BranchStorefrontLinkActionsProps) {
  const [isCopied, setIsCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1800)
    } catch {
      setIsCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline" className="rounded-full">
        <a href={url} target="_blank" rel="noreferrer">
          <ExternalLink />
          Abrir
        </a>
      </Button>
      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={handleCopy}>
        {isCopied ? <Check /> : <Copy />}
        {isCopied ? "Copiado" : "Copiar link"}
      </Button>
    </div>
  )
}
