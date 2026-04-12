"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type KitchenBranchSelectorProps = {
  readonly activeBranchId: string
  readonly branches: readonly {
    readonly id: string
    readonly name: string
  }[]
}

export function KitchenBranchSelector({
  activeBranchId,
  branches,
}: KitchenBranchSelectorProps) {
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
    <div className="flex min-w-52 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Sucursal activa
      </span>
      <select
        value={activeBranchId}
        disabled={isPending}
        onChange={(event) => handleBranchChange(event.target.value)}
        className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
