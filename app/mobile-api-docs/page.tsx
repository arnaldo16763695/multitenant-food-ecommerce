import type { Metadata } from "next"

import { MobileApiSwagger } from "@/components/mobile-api/swagger-ui"

export const metadata: Metadata = {
  title: "Mobile API Docs",
  description: "Swagger UI para la API mobile customer-only.",
}

export default function MobileApiDocsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto mb-4 max-w-7xl rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Mobile API Docs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Swagger UI para la API customer-only consumida por Flutter. El spec OpenAPI vive en
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-900">/api/mobile/openapi</code>
          y la autenticacion usa
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-900">Authorization: Bearer &lt;token&gt;</code>
          .
        </p>
      </div>

      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <MobileApiSwagger specUrl="/api/mobile/openapi" />
      </div>
    </main>
  )
}
