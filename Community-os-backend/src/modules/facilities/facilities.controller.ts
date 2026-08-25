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

import { FacilitiesService } from './facilities.service';
import { FacilityItemsService } from './facility-items.service';

import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilityQueryDto } from './dto/facility-query.dto';
import {
  BorrowItemDto,
  CreateFacilityItemDto,
  ItemLoanQueryDto,
  LoanRemarksDto,
  RejectLoanDto,
  UpdateFacilityItemDto,
} from './dto/facility-item.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('facilities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FacilitiesController {
  constructor(
    private readonly facilitiesService: FacilitiesService,
    private readonly facilityItemsService: FacilityItemsService,
  ) {}

  // ==========================================
  // Borrowable Items
  // ==========================================

  @Get('items')
  @Permissions('facility.view')
  findItems(@Request() req: any) {
    return this.facilityItemsService.findItems(req.user.community.id);
  }

  @Post('items')
  @Permissions('facility.item.manage')
  createItem(@Request() req: any, @Body() dto: CreateFacilityItemDto) {
    return this.facilityItemsService.createItem(req.user.community.id, dto);
  }

  @Put('items/:id')
  @Permissions('facility.item.manage')
  updateItem(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityItemDto,
  ) {
    return this.facilityItemsService.updateItem(req.user.community.id, id, dto);
  }

  @Delete('items/:id')
  @Permissions('facility.item.manage')
  removeItem(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.facilityItemsService.removeItem(req.user.community.id, id);
  }

  @Get('items/loans')
  @Permissions('facility.item.borrow')
  findLoans(@Request() req: any, @Query() query: ItemLoanQueryDto) {
    return this.facilityItemsService.findLoans(req.user.community.id, req.user, query);
  }

  @Post('items/:itemId/loans')
  @Permissions('facility.item.borrow')
  borrow(
    @Request() req: any,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BorrowItemDto,
  ) {
    return this.facilityItemsService.borrow(req.user.community.id, req.user, itemId, dto);
  }

  @Patch('items/loans/:loanId/approve')
  @Permissions('facility.item.manage')
  approveLoan(
    @Request() req: any,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ) {
    return this.facilityItemsService.approveLoan(req.user.community.id, req.user, loanId);
  }

  @Patch('items/loans/:loanId/reject')
  @Permissions('facility.item.manage')
  rejectLoan(
    @Request() req: any,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() dto: RejectLoanDto,
  ) {
    return this.facilityItemsService.rejectLoan(req.user.community.id, req.user, loanId, dto);
  }

  @Patch('items/loans/:loanId/return')
  @Permissions('facility.item.manage')
  returnLoan(
    @Request() req: any,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() dto: LoanRemarksDto,
  ) {
    return this.facilityItemsService.returnLoan(req.user.community.id, loanId, dto);
  }

  @Delete('items/loans/:loanId')
  @Permissions('facility.item.borrow')
  cancelLoan(
    @Request() req: any,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ) {
    return this.facilityItemsService.cancelLoan(req.user.community.id, req.user, loanId);
  }

  // ==========================================
  // Create Facility
  // ==========================================

  @Post()
  @Permissions('facility.create')
  create(@Request() req: any, @Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Facilities
  // ==========================================

  @Get()
  @Permissions('facility.view')
  findAll(@Request() req: any, @Query() query: FacilityQueryDto) {
    return this.facilitiesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Facility By ID
  // ==========================================

  @Get(':id')
  @Permissions('facility.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.facilitiesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Facility
  // ==========================================

  @Put(':id')
  @Permissions('facility.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Facility
  // ==========================================

  @Delete(':id')
  @Permissions('facility.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.facilitiesService.remove(req.user.community.id, id);
  }
}
