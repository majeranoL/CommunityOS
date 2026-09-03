import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { MarkPaidInvoiceDto } from './dto/mark-paid.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Permissions('invoice.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Create invoice' })
  create(@Request() req: any, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(req.user.community.id, dto);
  }

  @Get()
  @Permissions('invoice.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List invoices' })
  findAll(@Request() req: any, @Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(req.user.community.id, query);
  }

  @Get(':id')
  @Permissions('invoice.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Get invoice' })
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(req.user.community.id, id);
  }

  @Put(':id')
  @Permissions('invoice.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Update invoice' })
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(req.user.community.id, id, dto);
  }

  @Post(':id/mark-paid')
  @Permissions('invoice.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Mark invoice as paid' })
  markPaid(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPaidInvoiceDto,
  ) {
    return this.invoicesService.markPaid(req.user.community.id, id, dto);
  }

  @Post(':id/checkout')
  @Permissions('invoice.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Create a gateway checkout for an invoice' })
  checkout(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.createGatewayCheckout(
      req.user.community.id,
      id,
    );
  }

  @Post(':id/void')
  @Permissions('invoice.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Void invoice' })
  void(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.void(req.user.community.id, id);
  }

  @Delete(':id')
  @Permissions('invoice.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Delete invoice' })
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.remove(req.user.community.id, id);
  }
}
