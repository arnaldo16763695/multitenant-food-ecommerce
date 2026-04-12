import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

type AdminPageShellProps = {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly badge?: string
  readonly actions?: ReactNode
  readonly density?: "default" | "compact"
  readonly children: ReactNode
}

export function AdminPageShell({
  eyebrow,
  title,
  description,
  badge,
  actions,
  density = "default",
  children,
}: AdminPageShellProps) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <section className={`rounded-[1.75rem] border border-border bg-card shadow-sm ${density === "compact" ? "p-4" : "p-6"}`}>
        <div className={`flex flex-col gap-4 lg:flex-row lg:justify-between ${density === "compact" ? "lg:items-center" : "lg:items-start"}`}>
          <div className={density === "compact" ? "space-y-1" : "space-y-3"}>
            <p className={`font-semibold uppercase tracking-[0.24em] text-orange-700 ${density === "compact" ? "text-xs" : "text-sm"}`}>
              {eyebrow}
            </p>
            <div>
              <h2 className={`${density === "compact" ? "text-2xl" : "text-3xl"} font-semibold tracking-tight text-card-foreground`}>
                {title}
              </h2>
              <p className={`${density === "compact" ? "mt-2 max-w-2xl text-xs leading-6" : "mt-3 max-w-3xl text-sm leading-7"} text-muted-foreground`}>
                {description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {badge ? <Badge variant="outline">{badge}</Badge> : null}
            {actions}
          </div>
        </div>
      </section>

      {children}
    </main>
  )
}
