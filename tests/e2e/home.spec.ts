import { expect, test } from "@playwright/test"

test("home page links into the public brands directory", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { level: 1, name: /descubre tiendas/i })).toBeVisible()

  await page.getByRole("link", { name: "Explorar tiendas" }).click()

  await expect(page).toHaveURL(/\/brands$/)
  await expect(page.getByRole("heading", { level: 1, name: /elige tienda/i })).toBeVisible()
})
