import Image from "next/image"

type TenantBrandMarkProps = {
  readonly name: string
  readonly logoImageUrl?: string | null
  readonly size?: "sm" | "md" | "lg"
  readonly className?: string
}

const SIZE_STYLES = {
  sm: {
    wrapper: "size-10 rounded-2xl",
    imagePadding: "p-2",
    fallbackText: "text-sm",
  },
  md: {
    wrapper: "size-11 rounded-[1.1rem]",
    imagePadding: "p-2.5",
    fallbackText: "text-sm",
  },
  lg: {
    wrapper: "size-14 rounded-[1.35rem]",
    imagePadding: "p-3",
    fallbackText: "text-base",
  },
} as const

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")
}

export function TenantBrandMark({
  name,
  logoImageUrl,
  size = "md",
  className = "",
}: TenantBrandMarkProps) {
  const styles = SIZE_STYLES[size]

  if (logoImageUrl) {
    return (
      <div className={`relative overflow-hidden border border-stone-950/10 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.08)] ${styles.wrapper} ${className}`.trim()}>
        <Image
          src={logoImageUrl}
          alt={`Logo de ${name}`}
          fill
          sizes={size === "lg" ? "56px" : size === "md" ? "44px" : "40px"}
          className={`object-contain ${styles.imagePadding}`}
        />
      </div>
    )
  }

  return (
    <div
      aria-label={`Marca ${name}`}
      className={`flex items-center justify-center bg-stone-950 font-semibold text-white shadow-[0_8px_24px_rgba(28,25,23,0.12)] ${styles.wrapper} ${styles.fallbackText} ${className}`.trim()}
    >
      {getInitials(name).toUpperCase()}
    </div>
  )
}
