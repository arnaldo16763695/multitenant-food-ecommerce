"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
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

type AdminNavigationItem = {
  readonly title: string
  readonly href: string
  readonly icon: LucideIcon
  readonly children?: readonly {
    readonly title: string
    readonly href: string
  }[]
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

export function AppSidebar() {
  const params = useParams<{ tenantSlug: string }>()
  const tenantSlug = params.tenantSlug ?? "demo-brand"
  const baseAdminPath = `/app/${tenantSlug}/admin`

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
                <Collapsible key={item.title} asChild defaultOpen={item.title === "Catalogo"} className="group/collapsible">
                  <SidebarMenuItem>
                    {item.children ? (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    ) : (
                      <SidebarMenuButton asChild>
                        <Link href={`${baseAdminPath}${item.href}`}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}


                    {item.children ? (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton asChild>
                                <Link href={`${baseAdminPath}${child.href}`}>{child.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    ) : null}
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick access</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={`${baseAdminPath}#catalog`}>
                    <Tag />
                    <span>Promociones</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={`${baseAdminPath}#settings`}>
                    <Users />
                    <span>Staff</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={`${baseAdminPath}#catalog`}>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/brands">
                <Store />
                <span>Volver al marketplace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
