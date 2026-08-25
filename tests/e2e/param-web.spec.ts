import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('parameter discovery', () => {
  test('searches a variant and opens its parameter by triplet', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('126 / 126 条')).toBeVisible()
    const search = page.getByRole('textbox', { name: '搜索参数' })
    await search.fill('t2m')
    await expect(page.getByText('1 / 126 条')).toBeVisible()
    await expect(page).toHaveURL(/q=t2m/)

    await search.fill('0.0.0')
    await search.press('Enter')
    await expect(page).toHaveURL(/#\/params\/0\/0\/0/)
    await expect(page.getByRole('heading', { name: /t 0\.0\.0/ })).toBeVisible()
  })

  test('filters by discipline and preserves state after visiting details', async ({ page }) => {
    await page.goto('/')
    await page.locator('.filter-select').first().click()
    await page.getByText('2 — 陆面', { exact: true }).click()

    await expect(page.getByText('3 / 126 条')).toBeVisible()
    await expect(page).toHaveURL(/d=2/)
    await page.getByRole('link', { name: '2.0.2', exact: true }).click()
    await page.getByRole('link', { name: /返回要素总表/ }).click()

    await expect(page.getByText('3 / 126 条')).toBeVisible()
    await expect(page).toHaveURL(/d=2/)
  })

  test('shows effective inherited values on details', async ({ page }) => {
    await page.goto('/#/params/0/0/0')

    await expect(page.getByRole('heading', { name: /条件变体（7）/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: /K.*继承/ }).first()).toBeVisible()
    await expect(page.getByText('“继承”表示该值来自条目级定义。')).toBeVisible()
  })

  test('uses cards on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/?q=t2m')

    await expect(page.locator('.mobile-list')).toBeVisible()
    await expect(page.locator('.desktop-table')).toBeHidden()
    await expect(page.getByText('1 / 126 条')).toBeVisible()
    await expect(page.locator('.mobile-list').getByText('t', { exact: true })).toBeVisible()
  })

  test('offers retry when registry loading fails', async ({ page }) => {
    await page.route('**/params.json', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/')

    await expect(page.getByText('数据加载失败')).toBeVisible()
    await expect(page.getByText(/HTTP 503/)).toBeVisible()
    await expect(page.getByRole('button', { name: '重试' })).toBeVisible()
  })
})

test.describe('accessibility', () => {
  for (const route of ['/', '/#/params/0/0/0']) {
    test(`${route} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(route)
      await expect(page.getByText(/schema v1/)).toBeVisible()

      const results = await new AxeBuilder({ page }).analyze()
      const blocking = results.violations.filter(({ impact }) =>
        impact === 'serious' || impact === 'critical',
      )
      expect(blocking).toEqual([])
    })
  }
})
