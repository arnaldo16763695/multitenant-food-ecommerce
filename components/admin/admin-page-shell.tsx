import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

type AdminPageShellProps = {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly badge?: string
  readonly children: ReactNode
}

export function AdminPageShell({ eyebrow, title, description, badge, children }: AdminPageShellProps) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">{eyebrow}</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-card-foreground">{title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          </div>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
      </section>

      {children}
    </main>
  )
}
