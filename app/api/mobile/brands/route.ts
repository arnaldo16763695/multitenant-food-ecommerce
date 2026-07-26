import { getPublicBrandsDirectory } from "@/lib/data/public-brands"
import { mobileJson } from "@/lib/mobile/api"

export async function GET() {
  const brands = await getPublicBrandsDirectory()

  if (!brands.length) {
    return mobileJson({ brands: [] })
  }

  return mobileJson({ brands })
}
