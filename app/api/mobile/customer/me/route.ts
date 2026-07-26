import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"

export async function GET(request: Request) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  return mobileJson({ customer: authResult.customerContext })
}
