import { expect, test } from "@playwright/test"

test("brands directory loads and preserves search filters", async ({ page }) => {
  await page.goto("/brands")

  await expect(page.getByRole("heading", { level: 1, name: /elige tienda/i })).toBeVisible()
  await expect(page.getByRole("button", { name: "Filtrar" })).toBeVisible()

  const searchInput = page.getByPlaceholder("Ej. burgers, centro, pollo...")
  await searchInput.fill("pollo")
  await page.getByRole("button", { name: "Filtrar" }).click()

  await expect(page).toHaveURL(/\/brands\?q=pollo/)
  await expect(searchInput).toHaveValue("pollo")
})
