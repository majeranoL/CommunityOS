import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { PublicService } from './public.service';

import { setRefreshTokenCookie } from '../auth/auth-cookies';

import { PublicCommunitiesQueryDto } from './dto/public-communities-query.dto';
import { ProvisionCommunityDto } from '../communities/dto/provision-community.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('communities')
  findCommunities(@Query() query: PublicCommunitiesQueryDto) {
    return this.publicService.findCommunities(query);
  }

  @Get('communities/:slug')
  findCommunityBySlug(@Param('slug') slug: string) {
    return this.publicService.findCommunityBySlug(slug);
  }

  @Get('plans')
  findPlans() {
    return this.publicService.findPlans();
  }

  @Post('hoa/signup')
  signup(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ProvisionCommunityDto,
  ) {
    return this.publicService
      .signup(dto, req.ip, req.headers?.['user-agent'])
      .then((result) => {
        const session: any = result?.data?.session;

        if (session && session.refreshToken) {
          setRefreshTokenCookie(res, session.refreshToken);
          delete session.refreshToken;
        }

        return result;
      });
  }
}
