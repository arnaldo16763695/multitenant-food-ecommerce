"use client"

import * as React from "react"

const ADMIN_THEME_COOKIE = "admin-theme"
const ADMIN_THEME_STORAGE_KEY = "vz-food-admin-theme"

type AdminTheme = "light" | "dark"

type AdminThemeContextValue = {
  readonly theme: AdminTheme
  readonly setTheme: (theme: AdminTheme) => void
  readonly toggleTheme: () => void
}

const AdminThemeContext = React.createContext<AdminThemeContextValue | null>(null)

type AdminThemeProviderProps = {
  readonly initialTheme: AdminTheme
  readonly children: React.ReactNode
}

export function AdminThemeProvider({ initialTheme, children }: AdminThemeProviderProps) {
  const [theme, setThemeState] = React.useState<AdminTheme>(initialTheme)

  const setTheme = React.useCallback((nextTheme: AdminTheme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, nextTheme)
    document.cookie = `${ADMIN_THEME_COOKIE}=${nextTheme}; path=/; max-age=31536000; samesite=lax`
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [setTheme, theme])

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)

    if (storedTheme === "light" || storedTheme === "dark") {
      if (storedTheme !== theme) {
        setThemeState(storedTheme)
      }

      document.cookie = `${ADMIN_THEME_COOKIE}=${storedTheme}; path=/; max-age=31536000; samesite=lax`
      return
    }

    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme)
    document.cookie = `${ADMIN_THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`
  }, [theme])

  const contextValue = React.useMemo<AdminThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme]
  )

  return (
    <AdminThemeContext.Provider value={contextValue}>
      <div className={theme === "dark" ? "dark" : undefined} data-admin-theme={theme}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  )
}

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext)

  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider.")
  }

  return context
}

export type { AdminTheme }
