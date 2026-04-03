"use client"

import Link from "next/link"
import { ChevronDown, MapPinned, ReceiptText, ShoppingBag, UserRound, UserRoundPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useShoppingBagCount } from "@/lib/storefront/bag-store"

type StorefrontHeaderProps = {
  readonly tenantSlug: string
  readonly brandName: string
  readonly branchLabel: string
  readonly cartItemsCount?: number
}

export function StorefrontHeader({ tenantSlug, brandName, branchLabel, cartItemsCount = 2 }: StorefrontHeaderProps) {
  const liveCartItemsCount = useShoppingBagCount(tenantSlug)
  const visibleCartCount = liveCartItemsCount || cartItemsCount

  return (
    <header className="sticky top-0 z-30 rounded-[1.8rem] border border-stone-950/10 bg-white/80 px-4 py-3 shadow-[0_18px_40px_rgba(120,53,15,0.08)] backdrop-blur md:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link className="inline-flex items-center gap-3" href={`/app/${tenantSlug}`}>
            <div className="flex size-11 items-center justify-center rounded-[1.1rem] bg-stone-950 text-sm font-semibold text-white">
              {brandName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">{brandName}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                <MapPinned className="size-3.5" />
                <span>{branchLabel}</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <Button asChild variant="outline" className="rounded-full px-4">
            <Link href={`/app/${tenantSlug}/bag`}>
              <ShoppingBag />
              Bolsa
              <span className="rounded-full bg-stone-950 px-2 py-0.5 text-xs font-semibold text-white">{visibleCartCount}</span>
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
              <DropdownMenuItem asChild>
                <Link href={`/app/${tenantSlug}/account/register`}>
                  <UserRoundPlus />
                  Registrarme
                </Link>
              </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
