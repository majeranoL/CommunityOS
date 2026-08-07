import { Controller, Get, Query } from '@nestjs/common';

import { PublicService } from './public.service';

import { PublicCommunitiesQueryDto } from './dto/public-communities-query.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('communities')
  findCommunities(@Query() query: PublicCommunitiesQueryDto) {
    return this.publicService.findCommunities(query);
  }
}
