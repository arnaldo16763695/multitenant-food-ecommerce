"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  MapPinned,
  Package2,
  Settings2,
  Store,
  Tag,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { NavUser } from "./nav-user"

type AdminNavigationItem = {
  readonly title: string
  readonly href: string
  readonly icon: LucideIcon
  readonly children?: readonly {
    readonly title: string
    readonly href: string
  }[]
}

type SidebarNavItemProps = {
  readonly item: AdminNavigationItem
  readonly baseAdminPath: string
  readonly currentHash: string
  readonly pathname: string
}

function buildAdminHref(baseAdminPath: string, href: string) {
  return `${baseAdminPath}${href}`
}

function isAnchorActive(currentHash: string, href: string) {
  return currentHash === href || (!currentHash && href === "#overview")
}

function SidebarNavItem({ item, baseAdminPath, currentHash, pathname }: SidebarNavItemProps) {
  const hasChildren = Boolean(item.children?.length)
  const isCurrentPage = pathname === baseAdminPath
  const isParentActive = isCurrentPage && isAnchorActive(currentHash, item.href)
  const hasActiveChild =
    isCurrentPage &&
    item.children?.some((child) => isAnchorActive(currentHash, child.href))

  const [isOpen, setIsOpen] = React.useState(Boolean(hasActiveChild))

  React.useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true)
    }
  }, [hasActiveChild])

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isParentActive}>
          <Link href={buildAdminHref(baseAdminPath, item.href)}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild className="group/collapsible" open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={Boolean(isParentActive || hasActiveChild)}>
            <item.icon />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => {
              const isChildActive = isCurrentPage && isAnchorActive(currentHash, child.href)

              return (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton asChild isActive={isChildActive}>
                    <Link href={buildAdminHref(baseAdminPath, child.href)}>{child.title}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

const adminNavigation: readonly AdminNavigationItem[] = [
  {
    title: "Resumen",
    href: "#overview",
    icon: LayoutDashboard,
  },
  {
    title: "Catalogo",
    href: "#catalog",
    icon: Store,
    children: [
      { title: "Productos", href: "#catalog" },
      { title: "Categorias", href: "#catalog" },
      { title: "Modificadores", href: "#catalog" },
    ],
  },
  {
    title: "Pedidos",
    href: "#orders",
    icon: ListOrdered,
    children: [
      { title: "Activos", href: "#orders" },
      { title: "Incidencias", href: "#orders" },
    ],
  },
  {
    title: "Sucursales",
    href: "#settings",
    icon: MapPinned,
  },
  {
    title: "Configuracion",
    href: "#settings",
    icon: Settings2,
  },
] as const

type AppSidebarProps = {
  readonly tenantSlug: string
}

export function AppSidebar({ tenantSlug }: AppSidebarProps) {
  const baseAdminPath = `/app/${tenantSlug}/admin`
  const pathname = usePathname()
  const [currentHash, setCurrentHash] = React.useState("")

  React.useEffect(() => {
    // Hash-based navigation keeps the current admin shell simple until each module gets its own route.
    const syncHash = () => {
      setCurrentHash(window.location.hash || "")
    }

    syncHash()
    window.addEventListener("hashchange", syncHash)

    return () => window.removeEventListener("hashchange", syncHash)
  }, [])

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-orange-500 text-white">
                    VZ
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">VZ Food Admin</span>
                    <span className="truncate text-xs text-muted-foreground">{tenantSlug}</span>
                  </div>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl">
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{tenantSlug}</DropdownMenuItem>
                <DropdownMenuItem>Centro principal</DropdownMenuItem>
                <DropdownMenuItem>Norte express</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavigation.map((item) => (
                <SidebarNavItem
                  key={item.title}
                  item={item}
                  baseAdminPath={baseAdminPath}
                  currentHash={currentHash}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick access</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === baseAdminPath && isAnchorActive(currentHash, "#catalog")}>
                  <Link href={buildAdminHref(baseAdminPath, "#catalog")}>
                    <Tag />
                    <span>Promociones</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === baseAdminPath && isAnchorActive(currentHash, "#settings")}>
                  <Link href={buildAdminHref(baseAdminPath, "#settings")}>
                    <Users />
                    <span>Staff</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === baseAdminPath && isAnchorActive(currentHash, "#catalog")}>
                  <Link href={buildAdminHref(baseAdminPath, "#catalog")}>
                    <Package2 />
                    <span>Inventario</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={{ name: "John Doe", email: "john.doe@example.com", avatar: "/placeholder.svg" }} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
