"use client"

import Link from "next/link"

import { LAST_ADMIN_WORKSPACE_STORAGE_KEY, type AdminWorkspaceOption } from "@/lib/auth/admin-workspaces"

import { Button } from "@/components/ui/button"

type AdminWorkspaceSelectorProps = {
  readonly options: readonly AdminWorkspaceOption[]
}

export function AdminWorkspaceSelector({ options }: AdminWorkspaceSelectorProps) {
  function handleWorkspaceClick(href: string) {
    window.localStorage.setItem(LAST_ADMIN_WORKSPACE_STORAGE_KEY, href)
  }

  return (
    <div className="grid gap-4">
      {options.map((option) => (
        <div key={option.key} className="rounded-[1.5rem] border border-stone-200 bg-white p-5 text-left shadow-[0_10px_30px_rgba(28,25,23,0.05)]">
          <p className="text-sm font-semibold text-stone-950">{option.label}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{option.description}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link href={option.href} onClick={() => handleWorkspaceClick(option.href)}>
              Entrar
            </Link>
          </Button>
        </div>
      ))}
    </div>
  )
}
