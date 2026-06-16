import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export { UserRole };

export interface Permission {
  resource: string;
  action: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    { resource: '*', action: '*' },
  ],
  QA: [
    { resource: 'projects', action: 'read' },
    { resource: 'tests', action: 'read' },
    { resource: 'tests', action: 'write' },
    { resource: 'executions', action: 'read' },
    { resource: 'executions', action: 'execute' },
    { resource: 'reports', action: 'read' },
    { resource: 'bugs', action: 'read' },
    { resource: 'bugs', action: 'write' },
    { resource: 'analytics', action: 'read' },
  ],
  QA_LEAD: [
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'write' },
    { resource: 'tests', action: 'read' },
    { resource: 'tests', action: 'write' },
    { resource: 'executions', action: 'read' },
    { resource: 'executions', action: 'write' },
    { resource: 'executions', action: 'execute' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'write' },
    { resource: 'bugs', action: 'read' },
    { resource: 'bugs', action: 'write' },
    { resource: 'environments', action: 'read' },
    { resource: 'environments', action: 'write' },
    { resource: 'analytics', action: 'read' },
  ],
  QA_ENGINEER: [
    { resource: 'projects', action: 'read' },
    { resource: 'tests', action: 'read' },
    { resource: 'tests', action: 'write' },
    { resource: 'executions', action: 'read' },
    { resource: 'executions', action: 'execute' },
    { resource: 'reports', action: 'read' },
    { resource: 'bugs', action: 'read' },
    { resource: 'bugs', action: 'write' },
    { resource: 'analytics', action: 'read' },
  ],
  AUTOMATION_ENGINEER: [
    { resource: 'projects', action: 'read' },
    { resource: 'tests', action: 'read' },
    { resource: 'tests', action: 'write' },
    { resource: 'tests', action: 'execute' },
    { resource: 'executions', action: 'read' },
    { resource: 'executions', action: 'write' },
    { resource: 'executions', action: 'execute' },
    { resource: 'reports', action: 'read' },
    { resource: 'bugs', action: 'read' },
    { resource: 'bugs', action: 'write' },
    { resource: 'scheduler', action: 'read' },
    { resource: 'scheduler', action: 'write' },
  ],
  DEVELOPER: [
    { resource: 'projects', action: 'read' },
    { resource: 'tests', action: 'read' },
    { resource: 'bugs', action: 'read' },
    { resource: 'bugs', action: 'write' },
    { resource: 'reports', action: 'read' },
  ],
  MANAGER: [
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'write' },
    { resource: 'tests', action: 'read' },
    { resource: 'executions', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'write' },
    { resource: 'bugs', action: 'read' },
    { resource: 'analytics', action: 'read' },
    { resource: 'users', action: 'read' },
  ],
  VIEWER: [
    { resource: 'projects', action: 'read' },
    { resource: 'tests', action: 'read' },
    { resource: 'executions', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'bugs', action: 'read' },
  ],
};

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  hasPermission(role: UserRole, resource: string, action: string): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.some(
      (p) =>
        (p.resource === '*' || p.resource === resource) &&
        (p.action === '*' || p.action === action)
    );
  }

  filterByPermission<T>(
    role: UserRole,
    items: T[],
    resource: string,
    action: string,
    getResourceId: (item: T) => string
  ): T[] {
    if (role === UserRole.ADMIN) {
      return items;
    }
    return items.filter(() => this.hasPermission(role, resource, action));
  }

  getPermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}