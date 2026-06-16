import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { LoginPageLocators } from '../locators/common.locators';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get name() {
    return 'LoginPage';
  }

  async login(email: string, password: string): Promise<void> {
    await this.wait.forElement(LoginPageLocators.emailInput);
    await this.action.fill(LoginPageLocators.emailInput, email);
    await this.action.fill(LoginPageLocators.passwordInput, password);
    await this.action.click(LoginPageLocators.submitButton);
  }

  async clickForgotPassword(): Promise<void> {
    await this.action.click(LoginPageLocators.forgotPassword);
  }

  async clickRegister(): Promise<void> {
    await this.action.click(LoginPageLocators.registerLink);
  }

  async getErrorMessage(): Promise<string> {
    return this.action.getText(LoginPageLocators.errorMessage);
  }

  async isRememberMeChecked(): Promise<boolean> {
    return this.action.isChecked(LoginPageLocators.rememberMe);
  }

  async toggleRememberMe(): Promise<void> {
    await this.action.check(LoginPageLocators.rememberMe);
  }
}