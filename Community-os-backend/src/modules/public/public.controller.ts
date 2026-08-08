import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';

import { PublicService } from './public.service';

import { PublicCommunitiesQueryDto } from './dto/public-communities-query.dto';
import { ProvisionCommunityDto } from '../communities/dto/provision-community.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('communities')
  findCommunities(@Query() query: PublicCommunitiesQueryDto) {
    return this.publicService.findCommunities(query);
  }

  @Get('plans')
  findPlans() {
    return this.publicService.findPlans();
  }

  @Post('hoa/signup')
  signup(@Request() req: any, @Body() dto: ProvisionCommunityDto) {
    return this.publicService.signup(dto, req.ip, req.headers?.['user-agent']);
  }
}
