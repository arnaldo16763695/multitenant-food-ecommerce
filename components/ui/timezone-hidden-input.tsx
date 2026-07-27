"use client"

import * as React from "react"

type TimezoneHiddenInputProps = {
  readonly name?: string
}

export function TimezoneHiddenInput({ name = "timeZone" }: TimezoneHiddenInputProps) {
  const [timeZone, setTimeZone] = React.useState("UTC")

  React.useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    if (browserTimeZone) {
      setTimeZone(browserTimeZone)
    }
  }, [])

  return <input name={name} type="hidden" value={timeZone} />
}
