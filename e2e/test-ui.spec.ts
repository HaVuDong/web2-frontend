import { test, expect } from '@playwright/test';

test.describe('QL_Tro App End-to-End Tests', () => {
  const baseURL = 'http://localhost:8081';

  test('Login Only Flow', async ({ page }) => {
    await page.goto(baseURL);
    
    // Wait for the login screen to render
    await expect(page.locator('text=Đăng nhập chủ trọ')).toBeVisible();
    
    // Introduce a small delay so the user can see the login screen clearly
    await page.waitForTimeout(2000);

    // Use Web Agent DOM to explicitly locate and fill input fields
    // React Native Web uses specific input types for email and secure text entry
    await page.locator('input[type="email"]').fill('owner@gmail.com');
    await page.locator('input[type="password"]').fill('123456');

    // Click the login button
    await page.getByText('Đăng nhập', { exact: true }).click();
    
    // Wait for dashboard to load
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
    
    // Tab 2: Quản lý Nhà/Phòng
    await page.getByText('Nhà/Phòng').click();
    await page.waitForTimeout(500);

    // Tab 3: Khách thuê
    await page.getByText('Khách thuê').click();
    await page.waitForTimeout(500);

    // Tab 4: Hợp đồng
    await page.getByText('Hợp đồng').click();
    await page.waitForTimeout(500);

    // Tab 5: Dịch vụ & Điện nước
    await page.getByText('Dịch vụ').click();
    await page.waitForTimeout(500);

    // Tab 6: Hóa đơn & Bảo trì
    await page.getByText('Hóa đơn').click();
    await page.waitForTimeout(500);
    
    // Hold the screen for a few seconds so the user can see the successful run
    await page.waitForTimeout(1000);
  });
});
