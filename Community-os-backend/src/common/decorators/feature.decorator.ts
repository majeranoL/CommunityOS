import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';

export const Feature = (code: string) => SetMetadata(FEATURE_KEY, code);
