import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { users } from '../test-data/users';

test.describe('Login Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto('/login');
  });

  test('should login with valid credentials', async () => {
    await loginPage.login(users.admin.email, users.admin.password);
    await loginPage.page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should show error with invalid credentials', async () => {
    await loginPage.login('invalid@test.com', 'wrongpass');
    await loginPage.assert.errorVisible();
  });

  test('should show validation error with empty email', async () => {
    await loginPage.login('', 'password');
    await loginPage.assert.formErrorVisible();
  });

  test('should show validation error with empty password', async () => {
    await loginPage.login('test@test.com', '');
    await loginPage.assert.formErrorVisible();
  });

  test('should navigate to register', async () => {
    await loginPage.clickRegister();
    await expect(loginPage.page).toHaveURL(/register/);
  });
});