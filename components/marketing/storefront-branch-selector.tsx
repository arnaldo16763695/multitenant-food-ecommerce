"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type StorefrontBranchSelectorProps = {
  readonly activeBranchId: string
  readonly branches: readonly {
    readonly id: string
    readonly name: string
  }[]
}

export function StorefrontBranchSelector({ activeBranchId, branches }: StorefrontBranchSelectorProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  function handleBranchChange(nextBranchId: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("branch", nextBranchId)
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">Sucursal activa</span>
      <select
        value={activeBranchId}
        disabled={isPending}
        onChange={(event) => handleBranchChange(event.target.value)}
        className="h-11 min-w-56 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-medium text-white outline-none transition focus-visible:border-orange-300 focus-visible:ring-3 focus-visible:ring-orange-300/30 disabled:opacity-60"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id} className="text-stone-950">
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
