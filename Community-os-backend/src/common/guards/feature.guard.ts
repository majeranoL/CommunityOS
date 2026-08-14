import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { FEATURE_KEY } from '../decorators/feature.decorator';

import { FeaturesService } from '../../modules/features/features.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featuresService: FeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const code = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!code) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const communityId = request.user?.community?.id;

    if (!communityId) {
      throw new ForbiddenException('No community context found.');
    }

    const enabled = await this.featuresService.isEnabled(communityId, code);

    if (!enabled) {
      throw new ForbiddenException(
        'This community does not have access to this feature.',
      );
    }

    return true;
  }
}
