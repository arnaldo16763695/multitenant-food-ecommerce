"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ChevronDown,
  ClipboardList,
  ImageIcon,
  ScrollText,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  SidebarRail,
} from "@/components/ui/sidebar"

type PlatformNavigationItem = {
  readonly title: string
  readonly href: string
  readonly icon: LucideIcon
}

const platformNavigation: readonly PlatformNavigationItem[] = [
  {
    title: "Tenants",
    href: "/platform/tenants",
    icon: Building2,
  },
  {
    title: "Signups",
    href: "/platform/signups",
    icon: ClipboardList,
  },
  {
    title: "Home banners",
    href: "/platform/home-banners",
    icon: ImageIcon,
  },
  {
    title: "Auditoria",
    href: "/platform/audit",
    icon: ScrollText,
  },
] as const

type PlatformSidebarProps = {
  readonly user: {
    name: string
    email: string
    avatar: string
  }
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PlatformSidebar({ user }: PlatformSidebarProps) {
  const pathname = usePathname()

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
                    <span className="truncate font-semibold">VZ Platform</span>
                    <span className="truncate text-xs text-muted-foreground">SaaS control center</span>
                  </div>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl">
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Platform admin</DropdownMenuItem>
                <DropdownMenuItem>Global operations</DropdownMenuItem>
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
              {platformNavigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isPathActive(pathname, item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick access</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isPathActive(pathname, "/platform/tenants")}>
                  <Link href="/platform/tenants">
                    <Store />
                    <span>Empresas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isPathActive(pathname, "/platform/signups")}>
                  <Link href="/platform/signups">
                    <Users />
                    <span>Prospectos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isPathActive(pathname, "/platform")}>
                  <Link href="/platform/tenants">
                    <ShieldCheck />
                    <span>Control SaaS</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isPathActive(pathname, "/platform/audit")}>
                  <Link href="/platform/audit">
                    <ScrollText />
                    <span>Auditoria</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
