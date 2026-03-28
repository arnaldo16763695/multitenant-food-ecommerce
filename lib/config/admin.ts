export type AdminMetric = {
  readonly label: string
  readonly value: string
  readonly hint: string
  readonly status: "success" | "warning" | "secondary"
}

export type AdminOrder = {
  readonly id: string
  readonly customer: string
  readonly branch: string
  readonly status: "Nuevo" | "En cocina" | "Listo"
  readonly total: string
  readonly eta: string
}

export type AdminTask = {
  readonly title: string
  readonly detail: string
  readonly owner: string
}

export const adminMetrics: readonly AdminMetric[] = [
  {
    label: "Ventas del dia",
    value: "$ 8,420",
    hint: "+12% vs ayer",
    status: "success",
  },
  {
    label: "Sucursales activas",
    value: "6 / 7",
    hint: "1 sucursal con horario pausado",
    status: "warning",
  },
  {
    label: "Tiempo promedio",
    value: "18 min",
    hint: "Objetivo < 20 min",
    status: "secondary",
  },
  {
    label: "Pedidos en riesgo",
    value: "4",
    hint: "2 requieren revision manual",
    status: "warning",
  },
] as const

export const recentOrders: readonly AdminOrder[] = [
  {
    id: "#4812",
    customer: "Ana Torres",
    branch: "Centro",
    status: "Nuevo",
    total: "$ 18.50",
    eta: "14 min",
  },
  {
    id: "#4811",
    customer: "Marco Ruiz",
    branch: "Norte",
    status: "En cocina",
    total: "$ 26.00",
    eta: "9 min",
  },
  {
    id: "#4809",
    customer: "Laura Diaz",
    branch: "Este",
    status: "Listo",
    total: "$ 13.20",
    eta: "0 min",
  },
  {
    id: "#4808",
    customer: "Jose Melo",
    branch: "Centro",
    status: "En cocina",
    total: "$ 31.90",
    eta: "6 min",
  },
] as const

export const adminTasks: readonly AdminTask[] = [
  {
    title: "Revisar override de stock en Norte",
    detail: "La sucursal reporta baja disponibilidad en bebidas y combos familiares.",
    owner: "Branch manager",
  },
  {
    title: "Ajustar tiempo de preparacion del menu lunch",
    detail: "Los pedidos del mediodia estan empujando el promedio por encima del objetivo.",
    owner: "Kitchen ops",
  },
  {
    title: "Confirmar nuevos roles de caja",
    detail: "Hay dos altas pendientes antes del siguiente turno de cierre.",
    owner: "Admin tenant",
  },
] as const
