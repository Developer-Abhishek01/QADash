export const CommonLocators = {
  buttons: {
    primary: 'button[type="submit"], button[class*="primary"], button:has-text("Submit")',
    secondary: 'button[class*="secondary"], button:has-text("Cancel")',
    danger: 'button[class*="danger"], button:has-text("Delete")',
    icon: 'button[class*="icon"]',
    loading: 'button:has([class*="spinner"]), button[disabled]',
  },
  inputs: {
    text: 'input[type="text"]',
    email: 'input[type="email"]',
    password: 'input[type="password"]',
    number: 'input[type="number"]',
    search: 'input[type="search"]',
    file: 'input[type="file"]',
    checkbox: 'input[type="checkbox"]',
    radio: 'input[type="radio"]',
    textarea: 'textarea',
    select: 'select',
  },
  links: {
    primary: 'a[class*="primary"]',
    navigation: 'nav a, .nav a, [role="navigation"] a',
    breadcrumb: '[class*="breadcrumb"] a',
  },
  containers: {
    modal: '[class*="modal"], [role="dialog"]',
    drawer: '[class*="drawer"], [class*="sidebar"]',
    dropdown: '[class*="dropdown"], [class*="menu"]',
    tooltip: '[class*="tooltip"], [role="tooltip"]',
    toast: '[class*="toast"], [class*="notification"]',
  },
  navigation: {
    header: 'header, [class*="header"]',
    sidebar: 'aside, [class*="sidebar"]',
    nav: 'nav, [role="navigation"]',
    tabs: '[class*="tabs"], [role="tablist"]',
  },
  feedback: {
    loading: '[class*="loading"], [class*="spinner"], [data-testid*="loading"]',
    error: '[class*="error"], [role="alert"], .alert-danger',
    success: '[class*="success"], .alert-success',
    warning: '[class*="warning"], .alert-warning',
  },
  tables: {
    table: 'table, [class*="table"]',
    row: 'tr, [class*="row"]',
    cell: 'td, th, [class*="cell"]',
    header: 'thead, [class*="header"]',
    pagination: '[class*="pagination"]',
  },
};

export const LoginPageLocators = {
  emailInput: 'input[name="email"]',
  passwordInput: 'input[name="password"]',
  submitButton: 'button[type="submit"]',
  forgotPassword: 'a:has-text("Forgot Password"), a:has-text("Forgot password")',
  registerLink: 'a:has-text("Sign up")',
  errorMessage: '[role="alert"][class*="MuiAlert-standardError"]',
  formError: 'p.MuiFormHelperText-root.Mui-error',
  rememberMe: 'input[name="remember"], input[type="checkbox"]',
};

export const DashboardPageLocators = {
  welcomeMessage: 'text=Welcome back',
  statsCards: '[class*="MuiCard-root"]',
  projectsList: 'nav a, [class*="MuiList-root"]',
  recentExecutions: 'table, [class*="MuiTable-root"]',
  sidebar: '[class*="MuiDrawer"]',
  userMenu: 'button:has([class*="MuiAvatar-root"])',
  userMenuDropdown: 'text=Logout',
  notifications: '[class*="MuiBadge-root"]',
  notificationsPanel: 'text=View all notifications',
};

export const ProjectsPageLocators = {
  createButton: 'button:has-text("Create Project"), button:has-text("New Project")',
  searchInput: 'input[placeholder*="Search"], input[type="search"]',
  projectCard: '[class*="project-card"], [class*="project-item"]',
  projectName: '[class*="project-name"], [class*="title"]',
  projectStatus: '[class*="status"], [class*="badge"]',
  editButton: 'button:has-text("Edit"), [class*="edit"]',
  deleteButton: 'button:has-text("Delete"), [class*="delete"]',
  emptyState: '[class*="empty"], [data-testid*="empty"]',
};

export const TestExecutionLocators = {
  runButton: 'button:has-text("Run"), button:has-text("Execute")',
  stopButton: 'button:has-text("Stop"), button:has-text("Cancel")',
  progressBar: '[class*="progress"], [role="progressbar"]',
  statusBadge: '[class*="status"], [class*="badge"]',
  logsPanel: '[class*="logs"], [class*="output"]',
  resultsTable: '[class*="results"], table:has-text("Test")',
  filterButton: 'button:has-text("Filter"), [class*="filter"]',
  downloadButton: 'button:has-text("Download"), [class*="download"]',
};

export class LocatorBuilder {
  static byTestId(testId: string): string {
    return `[data-testid="${testId}"]`;
  }

  static byText(text: string, type: 'contains' | 'exact' = 'contains'): string {
    return type === 'contains' 
      ? `text=${text}`
      : `text="${text}"`;
  }

  static byPlaceholder(placeholder: string): string {
    return `input[placeholder="${placeholder}"], textarea[placeholder="${placeholder}"]`;
  }

  static byRole(role: string, options?: { name?: string }): string {
    return options?.name 
      ? `[role="${role}"][aria-label*="${options.name}"], [role="${role}"][aria-labelledby*="${options.name}"]`
      : `[role="${role}"]`;
  }

  static byLabel(label: string): string {
    return `label:has-text("${label}"), [for="${label}"], input[id="${label}"], input[aria-label="${label}"]`;
  }

  static nth(index: number): string {
    return `:nth-match(${index})`;
  }
}