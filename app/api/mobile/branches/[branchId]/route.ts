import { getMobileBranchDetail } from "@/lib/data/mobile-branch-detail"
import { mobileError, mobileJson } from "@/lib/mobile/api"

type MobileBranchDetailRouteContext = {
  readonly params: Promise<{
    branchId: string
  }>
}

export async function GET(_request: Request, context: MobileBranchDetailRouteContext) {
  const { branchId } = await context.params
  const branch = await getMobileBranchDetail(branchId)

  if (!branch) {
    return mobileError(404, "Branch not found.")
  }

  return mobileJson({ branch })
}
