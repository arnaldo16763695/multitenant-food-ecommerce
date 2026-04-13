"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

import { AdminSignOutButton } from "@/components/auth/admin-sign-out-button"

type PlatformShellProps = {
  readonly userName: string
  readonly children: ReactNode
}

const platformLinks = [
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/signups", label: "Signups" },
] as const

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`)
}

export function PlatformShell({ userName, children }: PlatformShellProps) {
  const currentPath = usePathname()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.14),_transparent_26%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-stone-200 bg-white/85 px-5 py-4 shadow-[0_18px_50px_rgba(28,25,23,0.06)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Platform Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Panel del SaaS</h1>
            <p className="mt-1 text-sm text-stone-600">Operas tenants, signups y soporte desde una capa separada del admin de cada marca.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700">
              {userName}
            </span>
            <AdminSignOutButton />
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {platformLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActivePath(currentPath, link.href)
                  ? "bg-stone-950 text-white"
                  : "border border-stone-300 bg-white text-stone-800 hover:border-stone-950"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </main>
  )
}
