import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { hasAnyPermission } from '../utils/permissions';
import { FeaturesService } from '../../modules/features/features.service';

/**
 * Allows managers (finance.view_all | finance.manage) through unconditionally.
 * For non-managers the finance-transparency feature must be enabled for the
 * requesting user's community, otherwise a 403 is thrown.
 */
@Injectable()
export class FinanceTransparencyGuard implements CanActivate {
  constructor(private readonly featuresService: FeaturesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    if (hasAnyPermission(user, ['finance.view_all', 'finance.manage'])) {
      return true;
    }

    const communityId = user.community?.id;

    if (!communityId) return false;

    const enabled = await this.featuresService.isEnabled(
      communityId,
      'finance-transparency',
    );

    if (!enabled) {
      throw new ForbiddenException(
        'Finance transparency is not enabled for this community.',
      );
    }

    return true;
  }
}
