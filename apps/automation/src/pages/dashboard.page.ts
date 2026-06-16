import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { DashboardPageLocators } from '../locators/common.locators';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get name() {
    return 'DashboardPage';
  }

  get locators() {
    return DashboardPageLocators;
  }

  async clickProjects(): Promise<void> {
    await this.action.click(`[class*="MuiListItemButton-root"]:has-text("Test Cases")`);
  }

  async clickExecutions(): Promise<void> {
    await this.action.click(`[class*="MuiListItemButton-root"]:has-text("Executions")`);
  }

  async clickReports(): Promise<void> {
    await this.action.click(`[class*="MuiListItemButton-root"]:has-text("Reports")`);
  }

  async openUserMenu(): Promise<void> {
    await this.action.click(DashboardPageLocators.userMenu);
  }

  async clickNotifications(): Promise<void> {
    await this.action.click(DashboardPageLocators.notifications);
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.action.click('text=Logout');
  }

  async getStatsCards(): Promise<string[]> {
    const cards = await this.page.locator(DashboardPageLocators.statsCards).all();
    return Promise.all(cards.map(async card => (await card.textContent()) || ''));
  }

  async getRecentExecutions(): Promise<string[]> {
    const executions = await this.page.locator(DashboardPageLocators.recentExecutions).all();
    return Promise.all(executions.map(async exec => (await exec.textContent()) || ''));
  }
}