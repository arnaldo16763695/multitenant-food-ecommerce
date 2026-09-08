// Normalizes a free-text Venezuelan phone number to E.164 digits without the leading "+"
// (the shape the WhatsApp Cloud API `to` field wants), e.g. "584121234567".
// Returns null when the input cannot be confidently normalized -- the caller then skips
// WhatsApp rather than risk sending to a wrong number.
export function normalizeVenezuelaPhone(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  // Keep digits only; a leading "+" carries no extra information once stripped.
  const digits = raw.replace(/\D/g, "")

  if (!digits) {
    return null
  }

  // Already country-coded: 58 + 10 national digits.
  if (digits.length === 12 && digits.startsWith("58")) {
    return digits
  }

  // National with trunk "0": 0XXXXXXXXXX (11 digits) -> drop the 0, prepend 58.
  if (digits.length === 11 && digits.startsWith("0")) {
    return `58${digits.slice(1)}`
  }

  // National without trunk: XXXXXXXXXX (10 digits) -> prepend 58.
  if (digits.length === 10) {
    return `58${digits}`
  }

  return null
}
