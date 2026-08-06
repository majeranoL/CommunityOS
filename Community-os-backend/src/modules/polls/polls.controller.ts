import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PollsService } from './polls.service';

import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { PollQueryDto } from './dto/poll-query.dto';
import { VoteDto } from './dto/vote.dto';
import { AddPollOptionDto } from './dto/add-poll-option.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('polls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  // ==========================================
  // Create Poll
  // ==========================================

  @Post()
  @Permissions('poll.create')
  create(@Request() req: any, @Body() dto: CreatePollDto) {
    return this.pollsService.create(req.user.community.id, req.user.id, dto);
  }

  // ==========================================
  // Get All Polls
  // ==========================================

  @Get()
  @Permissions('poll.view')
  findAll(@Request() req: any, @Query() query: PollQueryDto) {
    return this.pollsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Poll By ID
  // ==========================================

  @Get(':id')
  @Permissions('poll.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.findOne(req.user.community.id, id, req.user.id);
  }

  // ==========================================
  // Update Poll
  // ==========================================

  @Put(':id')
  @Permissions('poll.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePollDto,
  ) {
    return this.pollsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Poll
  // ==========================================

  @Delete(':id')
  @Permissions('poll.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Publish Poll
  // ==========================================

  @Patch(':id/publish')
  @Permissions('poll.publish')
  publish(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.publish(req.user.community.id, id);
  }

  // ==========================================
  // Close Poll
  // ==========================================

  @Patch(':id/close')
  @Permissions('poll.close')
  close(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.close(req.user.community.id, id);
  }

  // ==========================================
  // Vote
  // ==========================================

  @Post(':id/vote')
  @Permissions('poll.vote')
  vote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoteDto,
  ) {
    return this.pollsService.vote(req.user.community.id, req.user.id, id, dto);
  }

  // ==========================================
  // Add Option
  // ==========================================

  @Post(':id/options')
  @Permissions('poll.vote')
  addOption(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPollOptionDto,
  ) {
    return this.pollsService.addOption(req.user.community.id, id, dto);
  }
}
