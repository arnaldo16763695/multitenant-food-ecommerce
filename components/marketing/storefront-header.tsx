"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, House, LogIn, LogOut, MapPinned, ReceiptText, ShoppingBag, UserRound } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { TenantBrandMark } from "@/components/branding/tenant-brand-mark"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useShoppingBagCount } from "@/lib/storefront/bag-store"
import type { CustomerAccountContext } from "@/lib/auth/customer"
import { cn } from "@/lib/utils"

type StorefrontHeaderProps = {
  readonly tenantSlug: string
  readonly brandName: string
  readonly brandLogoImageUrl?: string | null
  readonly branchId: string | null
  readonly branchLabel: string
  readonly customerSession?: Pick<CustomerAccountContext, "user" | "customer"> | null
  readonly initialBagCount?: number
}

export function StorefrontHeader({ tenantSlug, brandName, brandLogoImageUrl, branchId, branchLabel, customerSession, initialBagCount = 0 }: StorefrontHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const liveCartItemsCount = useShoppingBagCount(tenantSlug, branchId ?? "", initialBagCount)
  const [isBagAnimating, setIsBagAnimating] = React.useState(false)
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = React.useState(false)
  const previousCountRef = React.useRef(liveCartItemsCount)
  const homeHref = branchId ? `/app/${tenantSlug}?branch=${branchId}` : `/app/${tenantSlug}`
  const bagHref = branchId ? `/app/${tenantSlug}/bag?branch=${branchId}` : `/app/${tenantSlug}/bag`
  const ordersHref = `/app/${tenantSlug}/account/orders`
  const accountHref = `/app/${tenantSlug}/account`
  const isHomeActive = pathname === `/app/${tenantSlug}`
  const isBagActive = pathname === `/app/${tenantSlug}/bag`
  const isOrdersActive = pathname === ordersHref
  const isAccountActive = pathname.startsWith(accountHref) && !isOrdersActive

  function getMobileNavLinkClassName(isActive: boolean, extraClassName?: string) {
    return cn(
      "flex h-11 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-950/5 hover:text-stone-950",
      isActive && "bg-orange-50 text-orange-600",
      extraClassName
    )
  }

  React.useEffect(() => {
    if (liveCartItemsCount > previousCountRef.current) {
      setIsBagAnimating(true)

      const timeout = window.setTimeout(() => {
        setIsBagAnimating(false)
      }, 560)

      previousCountRef.current = liveCartItemsCount

      return () => window.clearTimeout(timeout)
    }

    previousCountRef.current = liveCartItemsCount
  }, [liveCartItemsCount])

  async function handleCustomerSignOut() {
    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      router.refresh()
      return
    }

    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <>
      <div className="h-12" />
      <header className="fixed top-4 left-1/2 z-40 w-[min(calc(100vw-1.5rem),80rem)] -translate-x-1/2 rounded-[1.8rem] border border-stone-950/10 bg-white/80 px-4 py-3 shadow-[0_18px_40px_rgba(120,53,15,0.08)] backdrop-blur md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link className="inline-flex items-center gap-3" href={homeHref}>
              <TenantBrandMark name={brandName} logoImageUrl={brandLogoImageUrl} size="md" />
              <div>
                <p className="text-sm font-semibold text-stone-950">{brandName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                  <MapPinned className="size-3.5" />
                  <span>{branchLabel}</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-2 self-end md:flex lg:self-auto">
            <Button asChild variant="outline" className={`rounded-full px-4 transition-transform ${isBagAnimating ? "animate-bag-attention" : ""}`}>
              <Link href={bagHref}>
                <ShoppingBag className={isBagAnimating ? "text-orange-600" : undefined} />
                Bolsa
                <span className={`rounded-full bg-stone-950 px-2 py-0.5 text-xs font-semibold text-white transition-colors ${isBagAnimating ? "bg-orange-600" : ""}`}>
                  {liveCartItemsCount}
                </span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full px-4">
                  <UserRound />
                  Mi perfil
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl">
                <DropdownMenuLabel className="px-3 py-2">Cliente</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!customerSession ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/app/${tenantSlug}/account/login`}>
                      <LogIn />
                      Iniciar sesión
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={`/app/${tenantSlug}/account`}>
                    <UserRound />
                    Mi cuenta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/app/${tenantSlug}/account/orders`}>
                    <ReceiptText />
                    Mis pedidos
                  </Link>
                </DropdownMenuItem>
                {customerSession ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleCustomerSignOut} disabled={isSigningOut}>
                      <LogOut />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <nav className="fixed right-0 bottom-0 left-0 z-40 md:hidden" aria-label="Navegacion principal movil">
        <div className="grid grid-cols-5 border-t border-stone-950/10 bg-white/92 px-4 py-2 shadow-[0_-12px_30px_rgba(120,53,15,0.12)] backdrop-blur">
          <button
            type="button"
            className="flex h-11 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-950/5 hover:text-stone-950"
            aria-label="Salir al sitio principal"
            onClick={() => setIsExitDialogOpen(true)}
          >
            <ArrowLeft className="size-4.5" />
          </button>
          <Link
            className={getMobileNavLinkClassName(isAccountActive)}
            href={accountHref}
            aria-label="Mi perfil"
            aria-current={isAccountActive ? "page" : undefined}
          >
            <UserRound className="size-4.5" />
          </Link>
          <Link
            className={getMobileNavLinkClassName(isHomeActive)}
            href={homeHref}
            aria-label="Inicio"
            aria-current={isHomeActive ? "page" : undefined}
          >
            <House className="size-4.5" />
          </Link>
          <Link
            className={getMobileNavLinkClassName(isOrdersActive)}
            href={ordersHref}
            aria-label="Mis pedidos"
            aria-current={isOrdersActive ? "page" : undefined}
          >
            <ReceiptText className="size-4.5" />
          </Link>
          <Link
            className={getMobileNavLinkClassName(isBagActive, `relative ${isBagAnimating ? "animate-bag-attention text-orange-600" : ""}`)}
            href={bagHref}
            aria-label="Bolsa"
            aria-current={isBagActive ? "page" : undefined}
          >
            <ShoppingBag className="size-4.5" />
            <span className={`absolute top-1.5 right-1.5 min-w-4 rounded-full px-1 text-center text-[10px] font-semibold text-white ${isBagAnimating ? "bg-orange-600" : "bg-stone-950"}`}>
              {liveCartItemsCount}
            </span>
          </Link>
        </div>
      </nav>

      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="w-[min(92vw,460px)]">
          <DialogHeader>
            <DialogTitle>¿Salir de esta tienda?</DialogTitle>
            <DialogDescription>Vas a salir de {brandName} y volver al directorio de marcas de VZ Food.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setIsExitDialogOpen(false)
                router.push("/brands")
              }}
            >
              Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
