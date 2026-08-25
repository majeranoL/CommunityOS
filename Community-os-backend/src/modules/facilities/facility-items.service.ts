import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  ChargeRecurrence,
  FacilityItemLoanStatus,
  FinanceCategory,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { hasAnyPermission } from '../../common/utils/permissions';

const ITEM_BORROW_CHARGE_CODE = 'ITEM_BORROW';
const ITEM_BORROW_CHARGE_NAME = 'Facility Item Borrowing Fee';

const LOAN_INCLUDE = {
  item: true,
  resident: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      householdId: true,
    },
  },
  assessment: {
    select: {
      id: true,
      assessmentNumber: true,
      amount: true,
      paidAmount: true,
    },
  },
} satisfies Prisma.FacilityItemLoanInclude;

type LoanWithRelations = Prisma.FacilityItemLoanGetPayload<{
  include: typeof LOAN_INCLUDE;
}>;

@Injectable()
export class FacilityItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Items
  // ==========================================

  async createItem(communityId: string, dto: any) {
    const quantityTotal = dto.quantityTotal ?? 0;

    const item = await this.prisma.facilityItem.create({
      data: {
        communityId,
        name: dto.name.trim(),
        category: dto.category,
        description: dto.description?.trim(),
        imageUrl: dto.imageUrl,
        quantityTotal,
        quantityAvailable: quantityTotal,
        borrowFee: dto.borrowFee ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: 'Item created successfully.',
      data: item,
    };
  }

  async updateItem(communityId: string, id: string, dto: any) {
    const item = await this.prisma.facilityItem.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    let quantityAvailable: number | undefined = undefined;

    if (
      dto.quantityTotal !== undefined &&
      dto.quantityTotal !== item.quantityTotal
    ) {
      const outstanding = await this.outstandingQuantity(id);
      quantityAvailable = Math.max(
        0,
        Math.min(dto.quantityTotal, dto.quantityTotal - outstanding),
      );
    }

    const updated = await this.prisma.facilityItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim(),
        }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.quantityTotal !== undefined && {
          quantityTotal: dto.quantityTotal,
        }),
        ...(quantityAvailable !== undefined && { quantityAvailable }),
        ...(dto.borrowFee !== undefined && { borrowFee: dto.borrowFee }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      success: true,
      message: 'Item updated successfully.',
      data: updated,
    };
  }

  async removeItem(communityId: string, id: string) {
    const item = await this.prisma.facilityItem.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    await this.prisma.facilityItem.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return {
      success: true,
      message: 'Item removed successfully.',
    };
  }

  async findItems(communityId: string) {
    const items = await this.prisma.facilityItem.findMany({
      where: { communityId, deletedAt: null },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      message: 'Items retrieved successfully.',
      data: items,
    };
  }

  // ==========================================
  // Loans
  // ==========================================

  async borrow(communityId: string, user: any, itemId: string, dto: any) {
    const ownResidentId = user?.resident?.id;

    if (!ownResidentId) {
      throw new ForbiddenException(
        'You must be linked to a resident to borrow items.',
      );
    }

    const neededFrom = new Date(dto.neededFrom);
    const neededUntil = new Date(dto.neededUntil);

    if (
      Number.isNaN(neededFrom.getTime()) ||
      Number.isNaN(neededUntil.getTime())
    ) {
      throw new BadRequestException('Invalid borrowing dates.');
    }

    if (neededUntil < neededFrom) {
      throw new BadRequestException(
        'The return date must be on or after the pickup date.',
      );
    }

    const item = await this.prisma.facilityItem.findFirst({
      where: { id: itemId, communityId, deletedAt: null, isActive: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    if (item.quantityAvailable < dto.quantity) {
      throw new ConflictException(
        `Only ${item.quantityAvailable} unit(s) currently available.`,
      );
    }

    const feePerUnit = item.borrowFee ? Number(item.borrowFee) : 0;
    const totalFee = feePerUnit * dto.quantity;

    const loanNumber = await this.nextLoanNumber(communityId);

    const loan = await this.prisma.facilityItemLoan.create({
      data: {
        communityId,
        itemId,
        residentId: ownResidentId,
        loanNumber: `LOAN-${String(loanNumber).padStart(6, '0')}`,
        quantity: dto.quantity,
        purpose: dto.purpose?.trim(),
        neededFrom,
        neededUntil,
        feePerUnit,
        totalFee,
        status: FacilityItemLoanStatus.PENDING,
      },
      include: LOAN_INCLUDE,
    });

    return {
      success: true,
      message: 'Borrow request submitted successfully.',
      data: loan,
    };
  }

  async findLoans(communityId: string, user: any, query: any) {
    const isManager = hasAnyPermission(user, ['facility.item.manage']);

    const where: Prisma.FacilityItemLoanWhereInput = {
      communityId,
      deletedAt: null,
    };

    if (!isManager || query.mine === 'true') {
      where.residentId = user.resident?.id ?? '__none__';
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const loans = await this.prisma.facilityItemLoan.findMany({
      where,
      include: LOAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Loans retrieved successfully.',
      data: loans,
    };
  }

  async approveLoan(communityId: string, user: any, loanId: string) {
    const loan = await this.getLoanOrThrow(communityId, loanId);

    if (loan.status !== FacilityItemLoanStatus.PENDING) {
      throw new ConflictException('Only pending requests can be approved.');
    }

    const item = await this.prisma.facilityItem.findUnique({
      where: { id: loan.itemId },
    });

    if (!item || item.quantityAvailable < loan.quantity) {
      throw new ConflictException(
        `Not enough units available (${item?.quantityAvailable ?? 0} of ${loan.quantity} requested).`,
      );
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      await tx.facilityItem.update({
        where: { id: item.id },
        data: { quantityAvailable: { decrement: loan.quantity } },
      });

      let assessmentId: string | null = null;

      if (Number(loan.totalFee) > 0) {
        assessmentId = await this.chargeBorrower(tx, communityId, loan);
      }

      return tx.facilityItemLoan.update({
        where: { id: loan.id },
        data: {
          status: FacilityItemLoanStatus.APPROVED,
          approvedById: user.id,
          approvedAt: new Date(),
          assessmentId,
        },
        include: LOAN_INCLUDE,
      });
    });

    return {
      success: true,
      message: 'Borrow request approved.',
      data: approved,
    };
  }

  async rejectLoan(communityId: string, user: any, loanId: string, dto: any) {
    const loan = await this.getLoanOrThrow(communityId, loanId);

    if (loan.status !== FacilityItemLoanStatus.PENDING) {
      throw new ConflictException('Only pending requests can be rejected.');
    }

    const updated = await this.prisma.facilityItemLoan.update({
      where: { id: loan.id },
      data: {
        status: FacilityItemLoanStatus.REJECTED,
        rejectedById: user.id,
        rejectedAt: new Date(),
        rejectionReason: dto.reason?.trim(),
      },
      include: LOAN_INCLUDE,
    });

    return {
      success: true,
      message: 'Borrow request rejected.',
      data: updated,
    };
  }

  async returnLoan(communityId: string, loanId: string, dto: any) {
    const loan = await this.getLoanOrThrow(communityId, loanId);

    if (loan.status !== FacilityItemLoanStatus.APPROVED) {
      throw new ConflictException(
        'Only approved borrows can be marked returned.',
      );
    }

    const returned = await this.prisma.$transaction(async (tx) => {
      await tx.facilityItem.update({
        where: { id: loan.itemId },
        data: { quantityAvailable: { increment: loan.quantity } },
      });

      return tx.facilityItemLoan.update({
        where: { id: loan.id },
        data: {
          status: FacilityItemLoanStatus.RETURNED,
          returnedAt: new Date(),
          remarks: dto.remarks?.trim(),
        },
        include: LOAN_INCLUDE,
      });
    });

    return {
      success: true,
      message: 'Items marked as returned.',
      data: returned,
    };
  }

  async cancelLoan(communityId: string, user: any, loanId: string) {
    const loan = await this.getLoanOrThrow(communityId, loanId);

    if (!user.resident?.id || loan.residentId !== user.resident.id) {
      throw new ForbiddenException(
        'You can only cancel your own borrow requests.',
      );
    }

    if (loan.status !== FacilityItemLoanStatus.PENDING) {
      throw new ConflictException('Only pending requests can be cancelled.');
    }

    const updated = await this.prisma.facilityItemLoan.update({
      where: { id: loan.id },
      data: { status: FacilityItemLoanStatus.CANCELLED },
      include: LOAN_INCLUDE,
    });

    return {
      success: true,
      message: 'Borrow request cancelled.',
      data: updated,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async getLoanOrThrow(
    communityId: string,
    loanId: string,
  ): Promise<LoanWithRelations> {
    const loan = await this.prisma.facilityItemLoan.findFirst({
      where: { id: loanId, communityId, deletedAt: null },
      include: LOAN_INCLUDE,
    });

    if (!loan) {
      throw new NotFoundException('Borrow request not found.');
    }

    return loan;
  }

  private async outstandingQuantity(itemId: string) {
    const agg = await this.prisma.facilityItemLoan.aggregate({
      where: {
        itemId,
        deletedAt: null,
        status: FacilityItemLoanStatus.APPROVED,
      },
      _sum: { quantity: true },
    });

    return agg._sum.quantity ?? 0;
  }

  private async nextLoanNumber(communityId: string): Promise<number> {
    const latest = await this.prisma.facilityItemLoan.findFirst({
      where: { communityId },
      orderBy: { loanNumber: 'desc' },
      select: { loanNumber: true },
    });

    if (!latest) return 1;

    const parsed = parseInt(latest.loanNumber.replace(/^LOAN-/, ''), 10);
    return Number.isNaN(parsed) ? 0 : parsed + 1;
  }

  private async nextAssessmentNumber(communityId: string): Promise<number> {
    const latest = await this.prisma.assessment.findFirst({
      where: { communityId },
      orderBy: { assessmentNumber: 'desc' },
      select: { assessmentNumber: true },
    });

    if (!latest) return 0;

    const parsed = parseInt(latest.assessmentNumber.replace(/^ASS-/, ''), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /** Finds the community's item-borrowing charge type or provisions a default. */
  private async ensureItemChargeType(communityId: string) {
    const existing = await this.prisma.chargeType.findFirst({
      where: {
        communityId,
        code: ITEM_BORROW_CHARGE_CODE,
        deletedAt: null,
      },
    });

    if (existing) return existing;

    return this.prisma.chargeType.create({
      data: {
        communityId,
        code: ITEM_BORROW_CHARGE_CODE,
        name: ITEM_BORROW_CHARGE_NAME,
        category: FinanceCategory.FACILITY_FEE,
        recurrence: ChargeRecurrence.ONE_TIME,
        isActive: true,
        autoGenerate: false,
      },
    });
  }

  /**
   * Creates an ISSUED assessment on the borrower's household so the fee flows
   * into the regular dues/payments ledger. Returns the assessment id, or null
   * when the borrower has no household to bill.
   */
  private async chargeBorrower(
    tx: Prisma.TransactionClient,
    communityId: string,
    loan: LoanWithRelations,
  ) {
    const householdId = loan.resident.householdId;

    if (!householdId) return null;

    const chargeType = await this.ensureItemChargeType(communityId);

    const nextNumber = (await this.nextAssessmentNumber(communityId)) + 1;

    const assessment = await tx.assessment.create({
      data: {
        communityId,
        householdId,
        chargeTypeId: chargeType.id,
        assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
        title: `${ITEM_BORROW_CHARGE_NAME} — ${loan.item.name} ×${loan.quantity}`,
        description: `Auto-charged for borrow request ${loan.loanNumber}.`,
        amount: loan.totalFee,
        dueDate: loan.neededFrom,
        status: AssessmentStatus.ISSUED,
      },
    });

    return assessment.id;
  }
}
