import { expect, test } from "@playwright/test"

test("demo storefront loads without operational seed data", async ({ page }) => {
  await page.goto("/app/demo-brand")

  await expect(page).toHaveURL(/\/app\/demo-brand$/)
  await expect(page.getByRole("heading", { level: 1, name: "Demo Brand" })).toBeVisible()
  await expect(page.getByText("Centro").first()).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: /nuestros productos/i })).toBeVisible()
  await expect(page.getByText("Classic Burger")).toBeVisible()
  await expect(page.getByText("Papas crujientes")).toBeVisible()
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible()
  await expect(page.getByRole("link", { name: /bolsa 0/i })).toHaveAttribute("href", /branch=demo-branch-centro/)
})
