// Lightweight "fly to bag" micro-interaction: clones the product visual that was just
// confirmed, then animates it shrinking and travelling towards whichever bag icon is
// currently visible (desktop header vs. mobile bottom nav both render one, tagged with
// data-bag-fly-target, so this works across breakpoints without knowing which one is shown).
// Uses the Web Animations API directly instead of injected CSS keyframes because the
// start/end points are computed per call from live bounding rects.
const FLY_DURATION_MS = 650

export function flyProductToBag(sourceElement: HTMLElement, imageUrl?: string | null) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return
  }

  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-bag-fly-target]")).find(
    (candidate) => candidate.getClientRects().length > 0
  )

  if (!target) {
    return
  }

  const sourceRect = sourceElement.getBoundingClientRect()

  if (sourceRect.width === 0 || sourceRect.height === 0) {
    return
  }

  const targetRect = target.getBoundingClientRect()
  const size = Math.min(sourceRect.width, sourceRect.height, 88)

  const clone = document.createElement(imageUrl ? "img" : "div")

  if (imageUrl && clone instanceof HTMLImageElement) {
    clone.src = imageUrl
    clone.alt = ""
  }

  Object.assign(clone.style, {
    position: "fixed",
    left: `${sourceRect.left + sourceRect.width / 2 - size / 2}px`,
    top: `${sourceRect.top + sourceRect.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    objectFit: "cover",
    background: imageUrl ? "#fff" : "#ea580c",
    boxShadow: "0 14px 34px rgba(120,53,15,0.32)",
    pointerEvents: "none",
    zIndex: "1000",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>)

  document.body.appendChild(clone)

  const deltaX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
  const deltaY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
  // Lift the midpoint above a straight line so the trip reads as a toss into the bag rather
  // than a flat slide -- proportional to the vertical distance, with a sensible floor/ceiling.
  const arcLift = -Math.min(160, Math.max(70, Math.abs(deltaY) * 0.7))

  const animation = clone.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${deltaX * 0.55}px, ${deltaY * 0.45 + arcLift}px) scale(0.62)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.15)`, opacity: 0.2, offset: 1 },
    ],
    { duration: FLY_DURATION_MS, easing: "cubic-bezier(0.32, 0.08, 0.24, 1)", fill: "forwards" }
  )

  const cleanup = () => clone.remove()
  animation.onfinish = cleanup
  animation.oncancel = cleanup
}
