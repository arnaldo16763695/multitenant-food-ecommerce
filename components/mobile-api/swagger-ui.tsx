"use client"

import Script from "next/script"

type MobileApiSwaggerProps = {
  readonly specUrl: string
}

declare global {
  type SwaggerUiBundleFactory = ((config: Record<string, unknown>) => unknown) & {
    presets: {
      apis: unknown
    }
  }

  interface Window {
    SwaggerUIBundle?: SwaggerUiBundleFactory
    SwaggerUIStandalonePreset?: unknown
  }
}

function initializeSwagger(specUrl: string) {
  if (!window.SwaggerUIBundle) {
    return
  }

  window.SwaggerUIBundle({
    url: specUrl,
    dom_id: "#mobile-api-swagger-ui",
    deepLinking: true,
    defaultModelsExpandDepth: -1,
    displayRequestDuration: true,
    docExpansion: "list",
    persistAuthorization: true,
    tryItOutEnabled: true,
    presets: [window.SwaggerUIBundle.presets.apis, window.SwaggerUIStandalonePreset].filter(Boolean),
    layout: "BaseLayout",
  })
}

export function MobileApiSwagger({ specUrl }: MobileApiSwaggerProps) {
  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" strategy="afterInteractive" onReady={() => initializeSwagger(specUrl)} />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
        onReady={() => initializeSwagger(specUrl)}
      />
      <div id="mobile-api-swagger-ui" className="min-h-[70vh]" />
    </>
  )
}
