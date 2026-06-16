import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { LoginPage } from '../pages/login.page';
import { users } from '../test-data/users';

test.describe('Dashboard Tests', () => {
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    
    await loginPage.goto('/login');
    await loginPage.login(users.admin.email, users.admin.password);
    await dashboardPage.waitForPageReady();
  });

  test('should display welcome message', async () => {
    await dashboardPage.assert.visible(dashboardPage.locators.welcomeMessage);
  });

  test('should display stats cards', async () => {
    await dashboardPage.assert.visible(dashboardPage.locators.statsCards);
  });

  test('should navigate to projects', async () => {
    await dashboardPage.clickProjects();
    await expect(dashboardPage.page).toHaveURL(/test-cases/);
  });

  test('should navigate to executions', async () => {
    await dashboardPage.clickExecutions();
    await expect(dashboardPage.page).toHaveURL(/executions/);
  });

  test('should navigate to reports', async () => {
    await dashboardPage.clickReports();
    await expect(dashboardPage.page).toHaveURL(/reports/);
  });

  test('should open user menu', async () => {
    await dashboardPage.openUserMenu();
    await dashboardPage.assert.visible(dashboardPage.locators.userMenuDropdown);
  });

  test('should show notifications', async () => {
    await dashboardPage.clickNotifications();
    await dashboardPage.assert.visible(dashboardPage.locators.notificationsPanel);
  });

  test('should logout', async () => {
    await dashboardPage.logout();
    await expect(dashboardPage.page).toHaveURL(/login/);
  });
});