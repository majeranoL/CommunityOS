import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_KEY = 'platformAdmin';

export const PlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
