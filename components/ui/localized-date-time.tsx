"use client"

import * as React from "react"

type LocalizedDateTimeProps = {
  readonly value: string
  readonly locale?: string
  readonly kind?: "dateTime" | "time"
  readonly className?: string
  readonly fallback?: string
}

export function LocalizedDateTime({
  value,
  locale = "es-MX",
  kind = "dateTime",
  className,
  fallback = "--",
}: LocalizedDateTimeProps) {
  const [formattedValue, setFormattedValue] = React.useState(fallback)

  React.useEffect(() => {
    const date = new Date(value)

    const nextValue =
      kind === "time"
        ? date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleString(locale)

    setFormattedValue(nextValue)
  }, [kind, locale, value])

  return (
    <time dateTime={value} className={className} suppressHydrationWarning>
      {formattedValue}
    </time>
  )
}
