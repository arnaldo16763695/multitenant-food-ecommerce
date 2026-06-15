import { HomePage } from "@/components/marketing/home-page"
import { getPublicBrandsDirectory } from "@/lib/data/public-brands"

export default async function Home() {
  const featuredDirectoryBrands = await getPublicBrandsDirectory()

  return <HomePage featuredDirectoryBrands={featuredDirectoryBrands.slice(0, 3)} />
}
