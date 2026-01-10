import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// Admin guard - only Admin
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== 'Admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}

// Manager guard - Manager or Admin
@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!['Admin', 'Manager'].includes(user?.role)) {
      throw new ForbiddenException('Manager access required');
    }
    return true;
  }
}

// Not Trial guard - all roles except Trial
@Injectable()
export class NotTrialGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === 'Trial') {
      throw new ForbiddenException('Trial users cannot perform this action');
    }
    return true;
  }
}

// Manager or Trial guard - Admin, Manager, or Trial (for view-only access)
@Injectable()
export class ManagerOrTrialGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!['Admin', 'Manager', 'Trial'].includes(user?.role)) {
      throw new ForbiddenException('Manager or Trial access required');
    }
    return true;
  }
}
