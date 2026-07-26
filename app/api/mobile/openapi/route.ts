import { mobileJson } from "@/lib/mobile/api"
import { buildMobileOpenApiDocument } from "@/lib/mobile/openapi"

export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  return mobileJson(buildMobileOpenApiDocument(origin))
}
