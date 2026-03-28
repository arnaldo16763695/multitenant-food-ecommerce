import type { BrandCard, PlatformSurface, ProjectPhase } from "@/lib/domain/platform";

export const platformName = "VZ Food";

export const platformSurfaces: readonly PlatformSurface[] = [
  {
    name: "Marketplace",
    description: "Descubre marcas, prioriza la sucursal mas cercana y dirige al cliente al flujo correcto de compra.",
    href: "/brands",
  },
  {
    name: "Tenant storefront",
    description: "Storefront por marca con branding propio, menu por sucursal y checkout preparado para crecer a mobile.",
    href: "/app/demo-brand",
  },
  {
    name: "Admin",
    description: "Backoffice para marcas y sucursales con enfoque en catalogo, operacion y control multi-tenant.",
    href: "/app/demo-brand/admin",
  },
  {
    name: "Kitchen",
    description: "Tablero operativo para preparadores con estados claros, tiempos de preparacion y foco en velocidad.",
    href: "/app/demo-brand/kitchen",
  },
];

export const phaseOnePlan: readonly ProjectPhase[] = [
  {
    name: "Foundation",
    goal: "Definir una base ordenada para tenancy, rutas principales y modulos iniciales sin sobreconstruir.",
    deliverables: [
      "Estructura de carpetas lista para marketplace, storefront, admin y kitchen.",
      "Configuracion compartida para el producto y copy inicial alineado con el SaaS.",
      "Pantallas base para orientar el desarrollo de la Fase 1.",
    ],
  },
  {
    name: "Tenancy direction",
    goal: "Preparar el proyecto para separar marca, sucursal y superficie desde el primer sprint.",
    deliverables: [
      "Rutas publicas y tenant-aware claras.",
      "Espacio para dominio y servicios compartidos.",
      "Base compatible con futura integracion de Supabase y app movil.",
    ],
  },
  {
    name: "Visual kickoff",
    goal: "Sustituir el starter generico por una home que comunique el producto real y el alcance inicial.",
    deliverables: [
      "Landing inicial con direccion de producto.",
      "Vista de marketplace multi-marca.",
      "Vistas placeholder para storefront, admin y kitchen.",
    ],
  },
];

// These brands are intentionally static for the kickoff phase while the data model is not connected yet.
export const featuredBrands: readonly BrandCard[] = [
  {
    id: "fire-burger",
    name: "Fire Burger",
    slug: "fire-burger",
    cuisine: "Burgers",
    headline: "Combos rapidos, cocina intensa y tiempos cortos para pickup.",
    nearestBranch: "Centro - 1.2 km",
    etaMinutes: 18,
    accent: "from-orange-500 via-red-500 to-amber-300",
  },
  {
    id: "pollo-rush",
    name: "Pollo Rush",
    slug: "pollo-rush",
    cuisine: "Fried chicken",
    headline: "Operacion enfocada en cocina por estaciones y ordenes de alta rotacion.",
    nearestBranch: "Norte - 2.1 km",
    etaMinutes: 24,
    accent: "from-yellow-400 via-orange-400 to-red-500",
  },
  {
    id: "verde-wraps",
    name: "Verde Wraps",
    slug: "verde-wraps",
    cuisine: "Healthy fast food",
    headline: "Menu ligero con disponibilidad por sucursal y promesas de entrega simples.",
    nearestBranch: "Este - 3.4 km",
    etaMinutes: 21,
    accent: "from-emerald-500 via-lime-400 to-teal-300",
  },
];
