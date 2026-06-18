"use client"

import * as React from "react"

import { LAST_ADMIN_WORKSPACE_STORAGE_KEY } from "@/lib/auth/admin-workspaces"

type AdminWorkspacePreferenceSyncProps = {
  readonly href: string
}

export function AdminWorkspacePreferenceSync({ href }: AdminWorkspacePreferenceSyncProps) {
  React.useEffect(() => {
    window.localStorage.setItem(LAST_ADMIN_WORKSPACE_STORAGE_KEY, href)
  }, [href])

  return null
}
