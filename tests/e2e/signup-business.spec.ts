import { expect, test } from "@playwright/test"

test("business signup page renders the public registration form and can return home", async ({ page }) => {
  await page.goto("/signup/business")

  await expect(page.getByRole("heading", { level: 1, name: /registra tu empresa/i })).toBeVisible()
  await expect(page.getByText("Registro de empresa")).toBeVisible()
  await expect(page.getByLabel("Empresa")).toBeVisible()
  await expect(page.getByLabel("Responsable")).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeVisible()

  await page.getByRole("link", { name: "Volver al inicio" }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { level: 1, name: /descubre tiendas/i })).toBeVisible()
})
