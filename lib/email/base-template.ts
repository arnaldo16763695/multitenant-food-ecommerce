// Shared HTML shell for transactional emails. Keeps the visual language already used across
// the lib/email/* modules: Arial, 560px column, brand accent #c2410c, dark CTA pill #111827,
// muted #78716c footnote. New modules should adopt this; migrating the older modules is a
// separate follow-up (avoid broad refactors).

type BaseEmailInput = {
  readonly eyebrow: string
  readonly headline: string
  // Trusted HTML for the message body (callers build it from controlled templates, not user input).
  readonly bodyHtml: string
  readonly cta?: {
    readonly label: string
    readonly url: string
  }
  readonly footnote?: string
}

export function renderBaseEmail({ eyebrow, headline, bodyHtml, cta, footnote }: BaseEmailInput): string {
  const ctaHtml = cta
    ? `<a href="${cta.url}" style="display: inline-block; margin-top: 24px; background: #111827; color: white; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 700;">${cta.label}</a>`
    : ""

  const footnoteHtml = footnote
    ? `<p style="font-size: 13px; line-height: 1.7; color: #78716c; margin-top: 24px;">${footnote}</p>`
    : ""

  return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1917;">
        <p style="font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #c2410c; font-weight: 700;">${eyebrow}</p>
        <h1 style="font-size: 28px; line-height: 1.1; margin-top: 12px;">${headline}</h1>
        ${bodyHtml}
        ${ctaHtml}
        ${footnoteHtml}
      </div>
    `
}
