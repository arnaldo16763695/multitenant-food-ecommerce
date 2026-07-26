type OpenApiDocument = {
  readonly openapi: string
  readonly info: {
    readonly title: string
    readonly version: string
    readonly description: string
  }
  readonly servers: readonly {
    readonly url: string
    readonly description: string
  }[]
  readonly tags: readonly {
    readonly name: string
    readonly description: string
  }[]
  readonly components: {
    readonly securitySchemes: Record<string, unknown>
    readonly schemas: Record<string, unknown>
  }
  readonly paths: Record<string, unknown>
}

function buildSchemaRef(name: string) {
  return { $ref: `#/components/schemas/${name}` }
}

function buildBearerSecurity() {
  return [{ bearerAuth: [] }]
}

function buildNullableSchema(schema: Record<string, unknown>) {
  return {
    ...schema,
    nullable: true,
  }
}

function buildNullableSchemaRef(name: string) {
  return {
    allOf: [buildSchemaRef(name)],
    nullable: true,
  }
}

export function buildMobileOpenApiDocument(origin: string): OpenApiDocument {
  const apiBaseUrl = `${origin.replace(/\/$/, "")}/api/mobile`

  return {
    openapi: "3.0.3",
    info: {
      title: "VZ Food Mobile API",
      version: "1.0.0",
      description:
        "Contrato OpenAPI para la API customer-only consumida por la app mobile nativa. Todas las rutas documentadas viven bajo /api/mobile y las rutas autenticadas exigen Authorization: Bearer <supabase_access_token>.",
    },
    servers: [
      {
        url: apiBaseUrl,
        description: "Current environment",
      },
    ],
    tags: [
      {
        name: "Marketplace",
        description: "Discovery y directorio publico de marcas para mobile.",
      },
      {
        name: "Customer",
        description: "Contexto del cliente autenticado.",
      },
      {
        name: "Storefront",
        description: "Storefront publico por marca y sucursal.",
      },
      {
        name: "Bag",
        description: "Bolsa del cliente autenticado por tenant y sucursal.",
      },
      {
        name: "Checkout",
        description: "Checkout mobile customer-only con comprobante manual.",
      },
      {
        name: "Orders",
        description: "Pedidos del cliente autenticado.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Supabase access token del cliente mobile autenticado.",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "string",
              example: "Missing Bearer token.",
            },
          },
        },
        Brand: {
          type: "object",
          required: ["id", "name", "slug", "cuisine", "headline", "nearestBranch", "etaMinutes", "accent", "storefrontHref", "activeBranchCount"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            cuisine: { type: "string" },
            headline: { type: "string" },
            nearestBranch: { type: "string" },
            etaMinutes: { type: "integer" },
            accent: { type: "string" },
            heroImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            logoImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            storefrontHref: { type: "string" },
            activeBranchCount: { type: "integer" },
          },
        },
        BrandsResponse: {
          type: "object",
          required: ["brands"],
          properties: {
            brands: {
              type: "array",
              items: buildSchemaRef("Brand"),
            },
          },
        },
        MobileHomeHeroBanner: {
          type: "object",
          required: ["id", "title", "subtitle", "imageUrl", "tenantSlug", "branchId", "ctaLabel", "ctaHref"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            imageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            tenantSlug: { type: "string" },
            branchId: buildNullableSchema({ type: "string", format: "uuid" }),
            ctaLabel: { type: "string" },
            ctaHref: { type: "string" },
          },
        },
        MobileHomeBrand: {
          type: "object",
          required: ["id", "name", "slug", "cuisine", "headline", "etaMinutes", "heroImageUrl", "logoImageUrl", "storefrontHref"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            cuisine: { type: "string" },
            headline: { type: "string" },
            etaMinutes: { type: "integer" },
            heroImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            logoImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            storefrontHref: { type: "string" },
          },
        },
        MobileHomeResponse: {
          type: "object",
          required: ["heroBanners", "nearbyBranches", "featuredBrands"],
          properties: {
            heroBanners: {
              type: "array",
              items: buildSchemaRef("MobileHomeHeroBanner"),
            },
            nearbyBranches: {
              type: "array",
              items: buildSchemaRef("NearbyBranch"),
            },
            featuredBrands: {
              type: "array",
              items: buildSchemaRef("MobileHomeBrand"),
            },
          },
        },
        NearbyBranchTenant: {
          type: "object",
          required: ["id", "name", "slug", "logoImageUrl", "heroImageUrl", "cuisine"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            logoImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            heroImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            cuisine: buildNullableSchema({ type: "string" }),
          },
        },
        NearbyBranch: {
          type: "object",
          required: [
            "id",
            "name",
            "heroImageUrl",
            "addressLine1",
            "city",
            "state",
            "postalCode",
            "countryCode",
            "latitude",
            "longitude",
            "distanceMeters",
            "distanceKilometers",
            "etaMinutes",
            "storefrontHref",
            "tenant",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            heroImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            addressLine1: buildNullableSchema({ type: "string" }),
            city: buildNullableSchema({ type: "string" }),
            state: buildNullableSchema({ type: "string" }),
            postalCode: buildNullableSchema({ type: "string" }),
            countryCode: buildNullableSchema({ type: "string" }),
            latitude: { type: "number" },
            longitude: { type: "number" },
            distanceMeters: { type: "integer" },
            distanceKilometers: { type: "number" },
            etaMinutes: { type: "integer" },
            storefrontHref: { type: "string" },
            tenant: buildSchemaRef("NearbyBranchTenant"),
          },
        },
        NearbyBranchesResponse: {
          type: "object",
          required: ["branches"],
          properties: {
            branches: {
              type: "array",
              items: buildSchemaRef("NearbyBranch"),
            },
          },
        },
        MobileCustomerContext: {
          type: "object",
          required: ["user", "profile", "customer"],
          properties: {
            user: {
              type: "object",
              required: ["id", "email"],
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
              },
            },
            profile: {
              type: "object",
              required: ["id", "fullName", "email"],
              properties: {
                id: { type: "string", format: "uuid" },
                fullName: buildNullableSchema({ type: "string" }),
                email: buildNullableSchema({ type: "string", format: "email" }),
              },
            },
            customer: {
              type: "object",
              required: ["id", "fullName", "email", "phone", "marketingOptIn"],
              properties: {
                id: { type: "string", format: "uuid" },
                fullName: buildNullableSchema({ type: "string" }),
                email: buildNullableSchema({ type: "string", format: "email" }),
                phone: buildNullableSchema({ type: "string" }),
                marketingOptIn: { type: "boolean" },
              },
            },
          },
        },
        CustomerMeResponse: {
          type: "object",
          required: ["customer"],
          properties: {
            customer: buildSchemaRef("MobileCustomerContext"),
          },
        },
        StorefrontBranch: {
          type: "object",
          required: ["id", "name", "heroImageUrl"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            heroImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
          },
        },
        StorefrontTenant: {
          type: "object",
          required: ["id", "name", "slug", "customDomain", "storefrontEnabled", "heroImageUrl", "logoImageUrl"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            customDomain: buildNullableSchema({ type: "string" }),
            storefrontEnabled: { type: "boolean" },
            heroImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            logoImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
          },
        },
        StorefrontProductVariant: {
          type: "object",
          required: ["id", "name", "basePrice", "isDefault"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            basePrice: { type: "string", example: "$ 10.00" },
            isDefault: { type: "boolean" },
          },
        },
        StorefrontModifierOption: {
          type: "object",
          required: ["id", "name", "priceDelta", "priceDeltaLabel"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            priceDelta: { type: "number" },
            priceDeltaLabel: { type: "string" },
          },
        },
        StorefrontModifierGroup: {
          type: "object",
          required: ["id", "name", "selectionType", "minSelect", "maxSelect", "options"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            selectionType: { type: "string", enum: ["single", "multiple"] },
            minSelect: { type: "integer" },
            maxSelect: { type: "integer" },
            options: {
              type: "array",
              items: buildSchemaRef("StorefrontModifierOption"),
            },
          },
        },
        StorefrontProduct: {
          type: "object",
          required: ["id", "name", "description", "basePrice", "hasVariants", "variants", "modifierGroups", "category", "imageUrl"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string" },
            basePrice: { type: "string", example: "$ 10.00" },
            hasVariants: { type: "boolean" },
            variants: {
              type: "array",
              items: buildSchemaRef("StorefrontProductVariant"),
            },
            modifierGroups: {
              type: "array",
              items: buildSchemaRef("StorefrontModifierGroup"),
            },
            category: { type: "string" },
            imageUrl: buildNullableSchema({ type: "string", format: "uri" }),
          },
        },
        Storefront: {
          type: "object",
          required: ["tenant", "branches", "activeBranch", "etaMinutes", "menu", "shareUrl"],
          properties: {
            tenant: buildSchemaRef("StorefrontTenant"),
            branches: {
              type: "array",
              items: buildSchemaRef("StorefrontBranch"),
            },
            activeBranch: buildNullableSchemaRef("StorefrontBranch"),
            etaMinutes: { type: "integer" },
            menu: {
              type: "array",
              items: buildSchemaRef("StorefrontProduct"),
            },
            shareUrl: { type: "string", format: "uri" },
          },
        },
        StorefrontResponse: {
          type: "object",
          required: ["storefront"],
          properties: {
            storefront: buildSchemaRef("Storefront"),
          },
        },
        StorefrontMenuCategory: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
          },
        },
        StorefrontMenuResponse: {
          type: "object",
          required: ["tenantSlug", "branch", "categories", "products"],
          properties: {
            tenantSlug: { type: "string" },
            branch: buildSchemaRef("StorefrontBranch"),
            categories: {
              type: "array",
              items: buildSchemaRef("StorefrontMenuCategory"),
            },
            products: {
              type: "array",
              items: buildSchemaRef("StorefrontProduct"),
            },
          },
        },
        ShoppingBagModifierSelection: {
          type: "object",
          required: ["modifierGroupId", "modifierGroupName", "modifierOptionId", "modifierOptionName", "priceDelta", "priceDeltaLabel"],
          properties: {
            modifierGroupId: { type: "string", format: "uuid" },
            modifierGroupName: { type: "string" },
            modifierOptionId: { type: "string", format: "uuid" },
            modifierOptionName: { type: "string" },
            priceDelta: { type: "number" },
            priceDeltaLabel: { type: "string" },
          },
        },
        ShoppingBagItem: {
          type: "object",
          required: ["id", "productId", "tenantSlug", "branchId", "name", "description", "category", "unitPrice", "unitPriceLabel", "quantity", "modifierSelections"],
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            productVariantId: buildNullableSchema({ type: "string", format: "uuid" }),
            variantName: buildNullableSchema({ type: "string" }),
            tenantSlug: { type: "string" },
            branchId: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            unitPrice: { type: "number" },
            unitPriceLabel: { type: "string" },
            quantity: { type: "integer" },
            modifierSelections: {
              type: "array",
              items: buildSchemaRef("ShoppingBagModifierSelection"),
            },
          },
        },
        BagResponse: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              items: buildSchemaRef("ShoppingBagItem"),
            },
          },
        },
        ShoppingBagMutationResult: {
          type: "object",
          required: ["ok"],
          properties: {
            ok: { type: "boolean" },
            error: { type: "string" },
            item: buildSchemaRef("ShoppingBagItem"),
            quantity: { type: "integer" },
          },
        },
        ClearBagResponse: {
          type: "object",
          required: ["ok", "quantity"],
          properties: {
            ok: { type: "boolean", enum: [true] },
            quantity: { type: "integer" },
          },
        },
        ModifierSelectionInput: {
          type: "object",
          required: ["modifierGroupId", "modifierGroupName", "modifierOptionId", "modifierOptionName", "priceDelta"],
          properties: {
            modifierGroupId: { type: "string", format: "uuid" },
            modifierGroupName: { type: "string" },
            modifierOptionId: { type: "string", format: "uuid" },
            modifierOptionName: { type: "string" },
            priceDelta: { type: "number" },
          },
        },
        AddBagItemRequest: {
          type: "object",
          required: ["branchId", "productId"],
          properties: {
            branchId: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            productVariantId: buildNullableSchema({ type: "string", format: "uuid" }),
            quantity: { type: "integer", minimum: 1, default: 1 },
            modifierSelections: {
              type: "array",
              items: buildSchemaRef("ModifierSelectionInput"),
            },
          },
        },
        ReplaceBagItemRequest: {
          type: "object",
          required: ["branchId", "productId", "quantity"],
          properties: {
            branchId: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            productVariantId: buildNullableSchema({ type: "string", format: "uuid" }),
            quantity: { type: "integer", minimum: 0 },
            modifierSelections: {
              type: "array",
              items: buildSchemaRef("ModifierSelectionInput"),
            },
          },
        },
        CheckoutBagItemInput: {
          type: "object",
          required: ["id", "productId", "tenantSlug", "branchId", "name", "description", "category", "unitPrice", "unitPriceLabel", "quantity", "modifierSelections"],
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            productVariantId: buildNullableSchema({ type: "string", format: "uuid" }),
            variantName: buildNullableSchema({ type: "string" }),
            tenantSlug: { type: "string" },
            branchId: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            unitPrice: { type: "number" },
            unitPriceLabel: { type: "string" },
            quantity: { type: "integer" },
            modifierSelections: {
              type: "array",
              items: buildSchemaRef("ModifierSelectionInput"),
            },
          },
        },
        CreateOrderResult: {
          type: "object",
          required: ["ok"],
          properties: {
            ok: { type: "boolean" },
            orderId: { type: "string", format: "uuid" },
            orderNumber: { type: "integer" },
            error: { type: "string" },
          },
        },
        CustomerOrderSummary: {
          type: "object",
          required: ["id", "orderNumber", "status", "fulfillmentType", "totalAmount", "placedAt", "itemCount"],
          properties: {
            id: { type: "string", format: "uuid" },
            orderNumber: { type: "integer" },
            status: { type: "string" },
            fulfillmentType: { type: "string", enum: ["pickup", "delivery"] },
            totalAmount: { type: "number" },
            placedAt: { type: "string", format: "date-time" },
            itemCount: { type: "integer" },
          },
        },
        CustomerOrdersResponse: {
          type: "object",
          required: ["orders"],
          properties: {
            orders: {
              type: "array",
              items: buildSchemaRef("CustomerOrderSummary"),
            },
          },
        },
        PaymentReceiptSubmissionSummary: {
          type: "object",
          required: ["id", "paymentMethod", "receiptImagePath", "reviewStatus", "rejectionReason", "submittedAt", "reviewedAt", "reviewedByName"],
          properties: {
            id: { type: "string", format: "uuid" },
            paymentMethod: { type: "string", enum: ["mobile_payment", "bank_transfer"] },
            receiptImagePath: { type: "string" },
            reviewStatus: { type: "string", enum: ["pending", "rejected", "accepted"] },
            rejectionReason: buildNullableSchema({ type: "string" }),
            submittedAt: { type: "string", format: "date-time" },
            reviewedAt: buildNullableSchema({ type: "string", format: "date-time" }),
            reviewedByName: buildNullableSchema({ type: "string" }),
          },
        },
        CustomerOrderDetailItem: {
          type: "object",
          required: ["id", "productName", "categoryName", "quantity", "unitPrice", "lineTotal", "modifiers"],
          properties: {
            id: { type: "string", format: "uuid" },
            productName: { type: "string" },
            categoryName: buildNullableSchema({ type: "string" }),
            quantity: { type: "integer" },
            unitPrice: { type: "number" },
            lineTotal: { type: "number" },
            modifiers: {
              type: "array",
              items: {
                type: "object",
                required: ["modifierGroupName", "modifierOptionName"],
                properties: {
                  modifierGroupName: { type: "string" },
                  modifierOptionName: { type: "string" },
                },
              },
            },
          },
        },
        CustomerOrderDetail: {
          type: "object",
          required: ["id", "orderNumber", "status", "paymentStatus", "paymentMethod", "paymentReceiptImageUrl", "paymentRejectionReason", "fulfillmentType", "totalAmount", "subtotalAmount", "placedAt", "customerName", "customerPhone", "customerEmail", "notes", "paymentReceiptSubmissions", "items"],
          properties: {
            id: { type: "string", format: "uuid" },
            orderNumber: { type: "integer" },
            status: { type: "string" },
            paymentStatus: { type: "string", enum: ["pending", "paid", "failed", "refunded"] },
            paymentMethod: buildNullableSchema({ type: "string", enum: ["mobile_payment", "bank_transfer"] }),
            paymentReceiptImageUrl: buildNullableSchema({ type: "string", format: "uri" }),
            paymentRejectionReason: buildNullableSchema({ type: "string" }),
            fulfillmentType: { type: "string", enum: ["pickup", "delivery"] },
            totalAmount: { type: "number" },
            subtotalAmount: { type: "number" },
            placedAt: { type: "string", format: "date-time" },
            customerName: { type: "string" },
            customerPhone: buildNullableSchema({ type: "string" }),
            customerEmail: buildNullableSchema({ type: "string", format: "email" }),
            notes: buildNullableSchema({ type: "string" }),
            paymentReceiptSubmissions: {
              type: "array",
              items: buildSchemaRef("PaymentReceiptSubmissionSummary"),
            },
            items: {
              type: "array",
              items: buildSchemaRef("CustomerOrderDetailItem"),
            },
          },
        },
        CustomerOrderDetailResponse: {
          type: "object",
          required: ["order"],
          properties: {
            order: buildSchemaRef("CustomerOrderDetail"),
          },
        },
        PaymentProofUpdatedResponse: {
          type: "object",
          required: ["ok"],
          properties: {
            ok: { type: "boolean", enum: [true] },
          },
        },
      },
    },
    paths: {
      "/brands": {
        get: {
          tags: ["Marketplace"],
          operationId: "listMobileBrands",
          summary: "List public brands for the mobile marketplace",
          responses: {
            200: {
              description: "Brands fetched successfully.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("BrandsResponse"),
                },
              },
            },
          },
        },
      },
      "/home": {
        get: {
          tags: ["Marketplace"],
          operationId: "getMobileHome",
          summary: "Return the mobile home payload with featured brands and nearby branches",
          parameters: [
            {
              name: "lat",
              in: "query",
              required: false,
              schema: { type: "number", format: "double" },
              description: "Customer latitude. Must be sent together with lng.",
            },
            {
              name: "lng",
              in: "query",
              required: false,
              schema: { type: "number", format: "double" },
              description: "Customer longitude. Must be sent together with lat.",
            },
          ],
          responses: {
            200: {
              description: "Mobile home payload.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("MobileHomeResponse"),
                },
              },
            },
            400: {
              description: "Invalid GPS coordinates request.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/branches/nearby": {
        get: {
          tags: ["Marketplace"],
          operationId: "listNearbyBranches",
          summary: "List nearby active branches using GPS coordinates",
          parameters: [
            {
              name: "lat",
              in: "query",
              required: true,
              schema: { type: "number", format: "double" },
            },
            {
              name: "lng",
              in: "query",
              required: true,
              schema: { type: "number", format: "double" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
            },
          ],
          responses: {
            200: {
              description: "Nearby branches ordered by distance.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("NearbyBranchesResponse"),
                },
              },
            },
            400: {
              description: "Missing or invalid GPS coordinates.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/customer/me": {
        get: {
          tags: ["Customer"],
          operationId: "getMobileCustomerContext",
          summary: "Return the authenticated mobile customer context",
          security: buildBearerSecurity(),
          responses: {
            200: {
              description: "Authenticated customer context.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("CustomerMeResponse"),
                },
              },
            },
            401: {
              description: "Missing or invalid bearer token.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            500: {
              description: "Supabase mobile/admin clients are not configured.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}": {
        get: {
          tags: ["Storefront"],
          operationId: "getMobileStorefront",
          summary: "Return a public storefront by tenant slug",
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "branchId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" },
              description: "Preferred active branch for branch-aware menu and pricing.",
            },
          ],
          responses: {
            200: {
              description: "Storefront payload.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("StorefrontResponse"),
                },
              },
            },
            404: {
              description: "Storefront not found or not enabled.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/menu": {
        get: {
          tags: ["Storefront"],
          operationId: "getMobileStorefrontMenu",
          summary: "Return the public menu for a tenant storefront branch",
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "branchId",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Branch menu payload.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("StorefrontMenuResponse"),
                },
              },
            },
            400: {
              description: "Missing branchId.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            404: {
              description: "Storefront or branch menu not found.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/bag": {
        get: {
          tags: ["Bag"],
          operationId: "getMobileBag",
          summary: "Return the authenticated customer's bag for a branch",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "branchId",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Current bag contents.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("BagResponse"),
                },
              },
            },
            400: {
              description: "Missing branchId.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
        delete: {
          tags: ["Bag"],
          operationId: "clearMobileBag",
          summary: "Clear the authenticated customer's bag for a branch",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "branchId",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Bag cleared.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ClearBagResponse"),
                },
              },
            },
            400: {
              description: "Missing branchId or bag clear failed.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/bag/items": {
        post: {
          tags: ["Bag"],
          operationId: "addMobileBagItem",
          summary: "Add an item to the authenticated customer's bag",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: buildSchemaRef("AddBagItemRequest"),
              },
            },
          },
          responses: {
            200: {
              description: "Item added successfully.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ShoppingBagMutationResult"),
                },
              },
            },
            400: {
              description: "Invalid payload or bag mutation rejected.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/bag/items/{bagItemId}": {
        patch: {
          tags: ["Bag"],
          operationId: "replaceMobileBagItem",
          summary: "Replace quantity or modifiers for a bag item",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "bagItemId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: buildSchemaRef("ReplaceBagItemRequest"),
              },
            },
          },
          responses: {
            200: {
              description: "Item replaced successfully.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ShoppingBagMutationResult"),
                },
              },
            },
            400: {
              description: "Invalid payload or mutation rejected.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
        delete: {
          tags: ["Bag"],
          operationId: "removeMobileBagItem",
          summary: "Remove a bag item",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "bagItemId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "branchId",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Item removed successfully.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ShoppingBagMutationResult"),
                },
              },
            },
            400: {
              description: "Missing branchId or mutation rejected.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
        post: {
          tags: ["Bag"],
          operationId: "decrementMobileBagItem",
          summary: "Decrement a bag item quantity by one",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "bagItemId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "branchId",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Item decremented successfully.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ShoppingBagMutationResult"),
                },
              },
            },
            400: {
              description: "Missing branchId or mutation rejected.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/checkout": {
        post: {
          tags: ["Checkout"],
          operationId: "createMobileCheckoutOrder",
          summary: "Create a mobile order with manual payment proof",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["branchId", "fullName", "phone", "email", "paymentMethod", "paymentProof", "items"],
                  properties: {
                    branchId: { type: "string", format: "uuid" },
                    fullName: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string", format: "email" },
                    notes: { type: "string" },
                    fulfillmentType: { type: "string", enum: ["pickup"], default: "pickup" },
                    paymentMethod: { type: "string", enum: ["mobile_payment", "bank_transfer"] },
                    paymentProof: { type: "string", format: "binary" },
                    items: {
                      type: "string",
                      description: "JSON stringified array of CheckoutBagItemInput objects.",
                      example:
                        '[{"id":"bag-item-id","productId":"product-id","tenantSlug":"demo-brand","branchId":"branch-id","name":"Combo","description":"Burger combo","category":"Combos","unitPrice":12.5,"unitPriceLabel":"$ 12.50","quantity":1,"modifierSelections":[]}]',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Order created successfully.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("CreateOrderResult"),
                },
              },
            },
            400: {
              description: "Validation failed or order creation rejected.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            500: {
              description: "Storage upload or order attachment failed.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/orders": {
        get: {
          tags: ["Orders"],
          operationId: "listMobileCustomerOrders",
          summary: "List the authenticated customer's orders for a tenant",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Customer orders.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("CustomerOrdersResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/orders/{orderId}": {
        get: {
          tags: ["Orders"],
          operationId: "getMobileCustomerOrder",
          summary: "Get a customer order detail",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Order detail.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("CustomerOrderDetailResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            404: {
              description: "Order not found for that customer and tenant.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
      "/storefront/{tenantSlug}/orders/{orderId}/payment-proof": {
        post: {
          tags: ["Orders"],
          operationId: "replaceMobileOrderPaymentProof",
          summary: "Upload or replace a manual payment proof for an order",
          security: buildBearerSecurity(),
          parameters: [
            {
              name: "tenantSlug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["paymentMethod", "paymentProof"],
                  properties: {
                    paymentMethod: { type: "string", enum: ["mobile_payment", "bank_transfer"] },
                    paymentProof: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Payment proof updated.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("PaymentProofUpdatedResponse"),
                },
              },
            },
            400: {
              description: "Validation failed or proof could not be attached.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            401: {
              description: "Unauthorized.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            404: {
              description: "Tenant not found for the order context.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
            500: {
              description: "Storage upload failed.",
              content: {
                "application/json": {
                  schema: buildSchemaRef("ErrorResponse"),
                },
              },
            },
          },
        },
      },
    },
  }
}
