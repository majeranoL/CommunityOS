import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  ChargeRecurrence,
  ConstructionBondStatus,
  ConstructionRequestStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../auditlogs/audit-logs.service';
import { PaymentsService } from '../finance/payments.service';
import { CreateConstructionRequestDto } from './dto/create-construction-request.dto';
import { ConstructionQueryDto } from './dto/construction-query.dto';
import { ConstructionRequirementDto } from './dto/construction-requirement.dto';
import { ResolveConstructionBondDto } from './dto/resolve-construction-bond.dto';
import { ReviewConstructionRequestDto } from './dto/review-construction-request.dto';

@Injectable()
export class ConstructionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly payments: PaymentsService,
  ) {}

  async listRequirements(communityId: string) {
    return this.prisma.constructionRequirement.findMany({
      where: { communityId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async saveRequirement(
    communityId: string,
    actorId: string,
    dto: ConstructionRequirementDto,
    id?: string,
  ) {
    if (id) {
      const existing = await this.prisma.constructionRequirement.findFirst({
        where: { id, communityId },
      });
      if (!existing) throw new NotFoundException('Construction requirement not found.');
    }
    const data = {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isRequired: dto.isRequired ?? true,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };
    const requirement = id
      ? await this.prisma.constructionRequirement.update({
          where: { id },
          data,
        })
      : await this.prisma.constructionRequirement.create({
          data: { communityId, ...data },
        });
    await this.auditLogs.log({
      communityId,
      actorId,
      action: id ? 'CONSTRUCTION_REQUIREMENT_UPDATED' : 'CONSTRUCTION_REQUIREMENT_CREATED',
      entity: 'ConstructionRequirement',
      entityId: requirement.id,
      after: requirement as unknown as Prisma.InputJsonValue,
    });
    return { success: true, data: requirement };
  }

  async list(
    communityId: string,
    user: any,
    query: ConstructionQueryDto,
    includeAll: boolean,
  ) {
    const residentId = user.resident?.id;
    const requests = await this.prisma.constructionRequest.findMany({
      where: {
        communityId,
        deletedAt: null,
        ...(includeAll ? {} : { submittedById: user.id }),
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.search
          ? {
              OR: [
                { requestNumber: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(residentId && !includeAll
          ? { household: { residentHouseholds: { some: { residentId } } } }
          : {}),
      },
      include: {
        household: { select: { id: true, block: true, lot: true, unit: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        bond: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: requests };
  }

  async findOne(communityId: string, id: string, user: any, includeAll: boolean) {
    const request = await this.prisma.constructionRequest.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
        ...(includeAll ? {} : { submittedById: user.id }),
      },
      include: {
        household: true,
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        completedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: { include: { requirement: true } },
        bond: { include: { assessment: true } },
      },
    });
    if (!request) throw new NotFoundException('Construction request not found.');
    return { success: true, data: request };
  }

  async create(communityId: string, user: any, dto: CreateConstructionRequestDto) {
    const residentId = user.resident?.id;
    if (!residentId) throw new BadRequestException('A resident household is required.');
    const start = new Date(dto.plannedStartDate);
    const end = new Date(dto.plannedEndDate);
    if (end <= start) throw new BadRequestException('Planned end date must be after the start date.');

    const membership = await this.prisma.residentHousehold.findFirst({
      where: { communityId, residentId, householdId: dto.householdId, status: 'ACTIVE' },
    });
    if (!membership) throw new NotFoundException('Household membership not found.');

    const requirements = await this.listRequirements(communityId);
    const supplied = new Set(dto.documents.map((document) => document.requirementId ?? document.documentType));
    const missing = requirements
      .filter((requirement) => requirement.isRequired && !supplied.has(requirement.id) && !supplied.has(requirement.name))
      .map((requirement) => requirement.name);
    if (missing.length) throw new BadRequestException(`Missing required documents: ${missing.join(', ')}`);

    const fileIds = dto.documents
      .map((document) => document.fileId)
      .filter((fileId): fileId is string => Boolean(fileId));
    if (fileIds.length) {
      const files = await this.prisma.upload.findMany({
        where: { id: { in: fileIds }, communityId },
        select: { id: true },
      });
      if (files.length !== new Set(fileIds).size) {
        throw new BadRequestException('One or more uploaded documents are invalid.');
      }
    }

    const request = await this.prisma.constructionRequest.create({
      data: {
        communityId,
        householdId: dto.householdId,
        submittedById: user.id,
        requestNumber: await this.nextRequestNumber(communityId),
        type: dto.type,
        title: dto.title.trim(),
        description: dto.description.trim(),
        location: dto.location?.trim(),
        contractorName: dto.contractorName?.trim(),
        plannedStartDate: start,
        plannedEndDate: end,
        bondAmount: dto.bondAmount ?? 0,
        documents: {
          create: dto.documents.map((document) => ({
            communityId,
            uploadedById: user.id,
            requirementId: document.requirementId,
            documentType: document.documentType.trim(),
            originalName: document.originalName.trim(),
            fileId: document.fileId,
            fileUrl: document.fileUrl,
          })),
        },
      },
      include: { documents: true, household: true },
    });
    await this.auditLogs.log({
      communityId,
      actorId: user.id,
      action: 'CONSTRUCTION_REQUEST_SUBMITTED',
      entity: 'ConstructionRequest',
      entityId: request.id,
      after: request as unknown as Prisma.InputJsonValue,
    });
    return { success: true, data: request };
  }

  async review(communityId: string, id: string, actorId: string, dto: ReviewConstructionRequestDto) {
    const request = await this.getRequest(communityId, id);
    if (request.status !== ConstructionRequestStatus.SUBMITTED) {
      throw new ConflictException('Only submitted requests can be reviewed.');
    }
    if (![ConstructionRequestStatus.APPROVED, ConstructionRequestStatus.REJECTED].includes(dto.status)) {
      throw new BadRequestException('Review status must be APPROVED or REJECTED.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.constructionRequest.update({
        where: { id },
        data: {
          status: dto.status,
          reviewNotes: dto.notes?.trim(),
          rejectionReason: dto.status === ConstructionRequestStatus.REJECTED ? dto.notes?.trim() : null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });
      if (dto.status === ConstructionRequestStatus.APPROVED && request.bondAmount.toNumber() > 0) {
        const chargeType = await tx.chargeType.upsert({
          where: { communityId_code: { communityId, code: 'CONSTRUCTION_BOND' } },
          create: {
            communityId,
            code: 'CONSTRUCTION_BOND',
            name: 'Construction bond',
            category: 'BOND',
            recurrence: ChargeRecurrence.ONE_TIME,
            allowAdvancePayment: false,
          },
          update: { isActive: true },
        });
        const assessment = await tx.assessment.create({
          data: {
            communityId,
            householdId: request.householdId,
            chargeTypeId: chargeType.id,
            assessmentNumber: await this.nextAssessmentNumber(communityId, tx),
            title: `Construction bond ${request.requestNumber}`,
            description: `Bond for ${request.title}`,
            amount: request.bondAmount,
            dueDate: new Date(),
            status: AssessmentStatus.ISSUED,
          },
        });
        await tx.constructionBond.create({
          data: {
            communityId,
            householdId: request.householdId,
            requestId: request.id,
            bondNumber: await this.nextBondNumber(communityId, tx),
            scope: request.title,
            depositAmount: request.bondAmount,
            assessmentId: assessment.id,
            status: ConstructionBondStatus.OPEN,
          },
        });
      }
      return next;
    });
    await this.auditLogs.log({
      communityId,
      actorId,
      action: `CONSTRUCTION_REQUEST_${dto.status}`,
      entity: 'ConstructionRequest',
      entityId: id,
      after: updated as unknown as Prisma.InputJsonValue,
    });
    return { success: true, data: updated };
  }

  async complete(communityId: string, id: string, actorId: string) {
    return this.transition(communityId, id, actorId, ConstructionRequestStatus.COMPLETED, 'CONSTRUCTION_REQUEST_COMPLETED');
  }

  async close(communityId: string, id: string, actorId: string) {
    return this.transition(communityId, id, actorId, ConstructionRequestStatus.CLOSED, 'CONSTRUCTION_REQUEST_CLOSED');
  }

  async cancel(communityId: string, id: string, user: any) {
    const request = await this.getRequest(communityId, id);
    if (request.submittedById !== user.id || request.status !== ConstructionRequestStatus.SUBMITTED) {
      throw new ConflictException('Only submitted requests can be cancelled by the submitter.');
    }
    const updated = await this.prisma.constructionRequest.update({
      where: { id },
      data: { status: ConstructionRequestStatus.CANCELLED, cancelledAt: new Date() },
    });
    return { success: true, data: updated };
  }

  async resolveBond(communityId: string, id: string, actorId: string, dto: ResolveConstructionBondDto) {
    const bond = await this.prisma.constructionBond.findFirst({
      where: { id, communityId, status: { in: [ConstructionBondStatus.OPEN, ConstructionBondStatus.ACTIVE] } },
    });
    if (!bond) throw new NotFoundException('Construction bond not found or already resolved.');
    if (![ConstructionBondStatus.REFUNDED, ConstructionBondStatus.FORFEITED].includes(dto.status)) {
      throw new BadRequestException('Bond must be resolved as REFUNDED or FORFEITED.');
    }
    if (dto.status === ConstructionBondStatus.REFUNDED && bond.assessmentId) {
      const payments = await this.prisma.payment.findMany({
        where: { communityId, status: 'VERIFIED', allocations: { some: { assessmentId: bond.assessmentId } } },
        select: { id: true },
      });
      for (const payment of payments) await this.payments.refund(communityId, payment.id, actorId);
    }
    const updated = await this.prisma.constructionBond.update({
      where: { id: bond.id },
      data: {
        status: dto.status,
        resolvedById: actorId,
        resolvedAt: new Date(),
        refundedAt: dto.status === ConstructionBondStatus.REFUNDED ? new Date() : null,
        forfeitedAt: dto.status === ConstructionBondStatus.FORFEITED ? new Date() : null,
        refundNotes: dto.notes,
      },
    });
    await this.auditLogs.log({
      communityId,
      actorId,
      action: `CONSTRUCTION_BOND_${dto.status}`,
      entity: 'ConstructionBond',
      entityId: bond.id,
      after: updated as unknown as Prisma.InputJsonValue,
    });
    return { success: true, data: updated };
  }

  private async transition(communityId: string, id: string, actorId: string, status: ConstructionRequestStatus, action: string) {
    const request = await this.getRequest(communityId, id);
    const allowed = status === ConstructionRequestStatus.COMPLETED
      ? request.status === ConstructionRequestStatus.APPROVED
      : request.status === ConstructionRequestStatus.COMPLETED;
    if (!allowed) throw new ConflictException('Invalid construction request status transition.');
    const updated = await this.prisma.constructionRequest.update({
      where: { id },
      data: status === ConstructionRequestStatus.COMPLETED
        ? { status, completedById: actorId, completedAt: new Date() }
        : { status, closedAt: new Date() },
    });
    await this.auditLogs.log({ communityId, actorId, action, entity: 'ConstructionRequest', entityId: id, after: updated as unknown as Prisma.InputJsonValue });
    return { success: true, data: updated };
  }

  private async getRequest(communityId: string, id: string) {
    const request = await this.prisma.constructionRequest.findFirst({ where: { id, communityId, deletedAt: null } });
    if (!request) throw new NotFoundException('Construction request not found.');
    return request;
  }

  private async nextRequestNumber(communityId: string) {
    const latest = await this.prisma.constructionRequest.findFirst({ where: { communityId }, orderBy: { requestNumber: 'desc' }, select: { requestNumber: true } });
    const next = latest ? parseInt(latest.requestNumber.replace(/^CON-/, ''), 10) + 1 : 1;
    return `CON-${String(next).padStart(6, '0')}`;
  }

  private async nextBondNumber(communityId: string, tx: Prisma.TransactionClient) {
    const latest = await tx.constructionBond.findFirst({ where: { communityId }, orderBy: { bondNumber: 'desc' }, select: { bondNumber: true } });
    const next = latest ? parseInt(latest.bondNumber.replace(/^BND-/, ''), 10) + 1 : 1;
    return `BND-${String(next).padStart(6, '0')}`;
  }

  private async nextAssessmentNumber(communityId: string, tx: Prisma.TransactionClient) {
    const latest = await tx.assessment.findFirst({ where: { communityId }, orderBy: { assessmentNumber: 'desc' }, select: { assessmentNumber: true } });
    const next = latest ? parseInt(latest.assessmentNumber.replace(/^ASS-/, ''), 10) + 1 : 1;
    return `ASS-${String(next).padStart(6, '0')}`;
  }
}
