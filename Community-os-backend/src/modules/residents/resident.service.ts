import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { UpdateResidentDto } from './dto/update-resident.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { VerifyResidentDto } from './dto/verify-resident.dto';
import { ResidentQueryDto } from './dto/resident-query.dto';
import {
  AccountStatus,
  ResidentStatus,
  ResidentType,
  SessionStatus,
  UserStatus,
} from '@prisma/client';

@Injectable()
export class ResidentService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Deactivate Linked Account
  // ==========================================

  private async deactivateLinkedAccount(user: {
    id: string;
    accountId: string;
  }) {
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: {
          id: user.accountId,
        },
        data: {
          status: AccountStatus.DISABLED,
        },
      }),
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          status: UserStatus.INACTIVE,
        },
      }),
      this.prisma.session.updateMany({
        where: {
          accountId: user.accountId,
          status: SessionStatus.ACTIVE,
        },
        data: {
          status: SessionStatus.REVOKED,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          accountId: user.accountId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);
  }

  private capitalize(value?: string) {
    if (!value) return value;

    return value
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getPermissionCodes(user: any): string[] {
    const codes: string[] = [];

    for (const userRole of user?.roles ?? []) {
      for (const rp of userRole.role?.permissions ?? []) {
        const code = rp.permission?.code as string;
        if (code) codes.push(code);
      }
    }

    return [...new Set(codes)];
  }

  private async getVerificationMode(communityId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key: 'residentVerification',
        },
      },
    });

    return (setting?.value as string | undefined) ?? 'auto';
  }

  async create(communityId: string, user: any, dto: CreateResidentDto) {
    // ==========================
    // Clean Inputs
    // ==========================

    dto.firstName = this.capitalize(dto.firstName)!;
    dto.middleName = this.capitalize(dto.middleName);
    dto.lastName = this.capitalize(dto.lastName)!;

    dto.suffix = dto.suffix?.trim().toUpperCase();

    dto.email = dto.email?.trim().toLowerCase();

    dto.phoneNumber = dto.phoneNumber?.trim();

    dto.block = dto.block?.trim();
    dto.lot = dto.lot?.trim();
    dto.street = dto.street?.trim();
    dto.address = dto.address?.trim();

    dto.profilePhotoUrl = dto.profilePhotoUrl?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================
    // Convert Birth Date
    // ==========================

    let birthDate: Date | undefined;

    if (dto.birthDate) {
      birthDate = new Date(dto.birthDate);

      if (isNaN(birthDate.getTime())) {
        throw new BadRequestException('Invalid birth date.');
      }

      if (birthDate > new Date()) {
        throw new BadRequestException('Birth date cannot be in the future.');
      }
    }

    // ==========================
    // Duplicate Email
    // ==========================

    if (dto.email) {
      const existingEmail = await this.prisma.resident.findFirst({
        where: {
          communityId,
          email: dto.email,
          deletedAt: null,
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists.');
      }
    }

    // ==========================
    // Duplicate Phone
    // ==========================

    if (dto.phoneNumber) {
      const existingPhone = await this.prisma.resident.findFirst({
        where: {
          communityId,
          phoneNumber: dto.phoneNumber,
          deletedAt: null,
        },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number already exists.');
      }
    }

    // ==========================
    // Self-Service Scope
    // ==========================

    const permissions = this.getPermissionCodes(user);

    const isOfficer = permissions.includes('resident.verify');

    let residentStatus: ResidentStatus = ResidentStatus.ACTIVE;

    if (!isOfficer) {
      const ownHousehold = user?.resident?.household;

      if (!ownHousehold?.id) {
        throw new ForbiddenException(
          'You must be linked to a household to add residents.',
        );
      }

      dto.householdId = ownHousehold.id;

      const verificationMode = await this.getVerificationMode(communityId);

      if (verificationMode === 'approval') {
        residentStatus = ResidentStatus.PENDING;
      }
    }

    // ==========================
    // Resident Type (self-service is always OWNER)
    // ==========================

    const residentType: ResidentType = isOfficer
      ? (dto.residentType ?? ResidentType.OWNER)
      : ResidentType.OWNER;

    // ==========================
    // Validate Household
    // ==========================

    if (dto.householdId) {
      const household = await this.prisma.household.findFirst({
        where: {
          id: dto.householdId,
          communityId,
          deletedAt: null,
        },
      });

      if (!household) {
        throw new NotFoundException('Household not found.');
      }
    }

    // ==========================
    // Transaction
    // ==========================

    const resident = await this.prisma.$transaction(async (tx) => {
      // Latest Resident Number

      const latestResident = await tx.resident.findFirst({
        where: {
          communityId,
        },
        orderBy: {
          residentNumber: 'desc',
        },
        select: {
          residentNumber: true,
        },
      });

      let residentNumber = 'RES-000001';

      if (latestResident) {
        const latestNumber = Number(
          latestResident.residentNumber.replace('RES-', ''),
        );

        residentNumber = `RES-${String(latestNumber + 1).padStart(6, '0')}`;
      }

      // Extra Safety

      const duplicateResident = await tx.resident.findFirst({
        where: {
          communityId,
          residentNumber,
        },
      });

      if (duplicateResident) {
        throw new ConflictException('Resident number already exists.');
      }

      // Create Resident

      return tx.resident.create({
        data: {
          communityId,

          residentNumber,

          householdId: dto.householdId,

          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          suffix: dto.suffix,

          birthDate,

          gender: dto.gender,
          civilStatus: dto.civilStatus,

          phoneNumber: dto.phoneNumber,
          email: dto.email,

          block: dto.block,
          lot: dto.lot,
          street: dto.street,
          address: dto.address,

          profilePhotoUrl: dto.profilePhotoUrl,
          remarks: dto.remarks,

          status: residentStatus,
          residentType,
        },

        select: {
          id: true,
          residentNumber: true,
          householdId: true,

          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,

          birthDate: true,
          gender: true,
          civilStatus: true,

          phoneNumber: true,
          email: true,

          block: true,
          lot: true,
          street: true,
          address: true,

          profilePhotoUrl: true,
          remarks: true,

          status: true,
          residentType: true,

          createdAt: true,
          updatedAt: true,
        },
      });
    });

    return {
      success: true,
      message: 'Resident created successfully.',
      data: resident,
    };
  }
  async findAll(communityId: string, query: ResidentQueryDto) {
    const { page, limit, search, status, gender, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          residentNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          middleName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phoneNumber: {
            contains: search,
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (gender) {
      where.gender = gender;
    }

    const [residents, total] = await this.prisma.$transaction([
      this.prisma.resident.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
        select: {
          id: true,
          residentNumber: true,

          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,

          gender: true,
          civilStatus: true,

          phoneNumber: true,
          email: true,

          block: true,
          lot: true,

          household: {
            select: {
              id: true,
              block: true,
              lot: true,
              unit: true,
              address: true,
              status: true,
            },
          },

          status: true,
          residentType: true,

          createdAt: true,
        },
      }),

      this.prisma.resident.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Residents retrieved successfully.',
      data: residents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }
  async findOne(communityId: string, residentId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        communityId,
        deletedAt: null,
      },

      select: {
        id: true,

        residentNumber: true,
        householdId: true,

        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
            status: true,
          },
        },

        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,

        birthDate: true,
        gender: true,
        civilStatus: true,

        phoneNumber: true,
        email: true,

        block: true,
        lot: true,
        street: true,
        address: true,

        profilePhotoUrl: true,
        remarks: true,

        status: true,
        residentType: true,
        movedOutAt: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    return {
      success: true,
      message: 'Resident retrieved successfully.',
      data: resident,
    };
  }
  async update(communityId: string, user: any, id: string, dto: UpdateResidentDto) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    // ==========================
    // Self-Service Scope
    // ==========================

    const permissions = this.getPermissionCodes(user);
    const isOfficer = permissions.includes('resident.verify');

    if (!isOfficer) {
      const ownHouseholdId = user?.resident?.household?.id;

      if (!ownHouseholdId) {
        throw new ForbiddenException(
          'You must be linked to a household to edit residents.',
        );
      }

      if (resident.householdId !== ownHouseholdId) {
        throw new ForbiddenException(
          'You can only edit residents in your own household.',
        );
      }

      dto.householdId = ownHouseholdId;
    }

    // ==========================
    // Clean Inputs
    // ==========================

    if (dto.firstName) dto.firstName = this.capitalize(dto.firstName)!;

    if (dto.middleName) dto.middleName = this.capitalize(dto.middleName);

    if (dto.lastName) dto.lastName = this.capitalize(dto.lastName)!;

    if (dto.suffix) dto.suffix = dto.suffix.trim().toUpperCase();

    if (dto.email) dto.email = dto.email.trim().toLowerCase();

    if (dto.phoneNumber) dto.phoneNumber = dto.phoneNumber.trim();

    if (dto.block) dto.block = dto.block.trim();

    if (dto.lot) dto.lot = dto.lot.trim();

    if (dto.street) dto.street = dto.street.trim();

    if (dto.address) dto.address = dto.address.trim();

    if (dto.profilePhotoUrl) dto.profilePhotoUrl = dto.profilePhotoUrl.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================
    // Birth Date
    // ==========================

    let birthDate: Date | undefined;

    if (dto.birthDate) {
      birthDate = new Date(dto.birthDate);

      if (isNaN(birthDate.getTime())) {
        throw new BadRequestException('Invalid birth date.');
      }

      if (birthDate > new Date()) {
        throw new BadRequestException('Birth date cannot be in the future.');
      }
    }

    // ==========================
    // Duplicate Email
    // ==========================

    if (dto.email) {
      const existing = await this.prisma.resident.findFirst({
        where: {
          communityId,
          email: dto.email,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Email already exists.');
      }
    }

    // ==========================
    // Duplicate Phone
    // ==========================

    if (dto.phoneNumber) {
      const existing = await this.prisma.resident.findFirst({
        where: {
          communityId,
          phoneNumber: dto.phoneNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Phone number already exists.');
      }
    }

    // ==========================
    // Validate Household
    // ==========================

    if (dto.householdId) {
      const household = await this.prisma.household.findFirst({
        where: {
          id: dto.householdId,
          communityId,
          deletedAt: null,
        },
      });

      if (!household) {
        throw new NotFoundException('Household not found.');
      }
    }

    // ==========================
    // Update Resident
    // ==========================

    const updatedResident = await this.prisma.resident.update({
      where: {
        id,
      },

      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        suffix: dto.suffix,

        ...(dto.householdId !== undefined && {
          householdId: dto.householdId,
        }),

        birthDate: birthDate ?? resident.birthDate,

        gender: dto.gender,
        civilStatus: dto.civilStatus,

        phoneNumber: dto.phoneNumber,
        email: dto.email,

        block: dto.block,
        lot: dto.lot,
        street: dto.street,
        address: dto.address,

        profilePhotoUrl: dto.profilePhotoUrl,

        remarks: dto.remarks,

        status: dto.status,
      },

      select: {
        id: true,
        residentNumber: true,
        householdId: true,

        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,

        birthDate: true,
        gender: true,
        civilStatus: true,

        phoneNumber: true,
        email: true,

        block: true,
        lot: true,
        street: true,
        address: true,

        profilePhotoUrl: true,
        remarks: true,

        status: true,
        residentType: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Resident updated successfully.',
      data: updatedResident,
    };
  }
  async moveOut(communityId: string, id: string) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            accountId: true,
          },
        },
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    if (resident.status === ResidentStatus.MOVED_OUT) {
      throw new BadRequestException('Resident has already moved out.');
    }

    if (resident.user) {
      await this.deactivateLinkedAccount(resident.user);
    }

    const updatedResident = await this.prisma.resident.update({
      where: {
        id,
      },
      data: {
        status: ResidentStatus.MOVED_OUT,
        movedOutAt: new Date(),
      },
      select: {
        id: true,
        residentNumber: true,
        householdId: true,

        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,

        gender: true,
        civilStatus: true,

        status: true,
        residentType: true,
        movedOutAt: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Resident marked as moved out.',
      data: updatedResident,
    };
  }
  async verify(
    communityId: string,
    verifierId: string,
    id: string,
    dto: VerifyResidentDto,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    if (resident.status !== ResidentStatus.PENDING) {
      throw new BadRequestException('Only pending residents can be verified.');
    }

    const updatedResident = await this.prisma.resident.update({
      where: {
        id,
      },
      data: {
        status: dto.approved ? ResidentStatus.ACTIVE : ResidentStatus.INACTIVE,
        verifiedById: verifierId,
        verifiedAt: new Date(),
        verificationRemarks: dto.remarks,
      },
      select: {
        id: true,
        residentNumber: true,
        householdId: true,

        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,

        gender: true,
        civilStatus: true,

        status: true,
        residentType: true,
        verifiedById: true,
        verifiedAt: true,
        verificationRemarks: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: dto.approved
        ? 'Resident approved successfully.'
        : 'Resident rejected successfully.',
      data: updatedResident,
    };
  }
  async remove(communityId: string, user: any, id: string) {
    const resident = await this.prisma.resident.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            accountId: true,
          },
        },
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    // ==========================
    // Self-Service Scope
    // ==========================

    const permissions = this.getPermissionCodes(user);
    const isOfficer = permissions.includes('resident.verify');

    if (!isOfficer) {
      const ownHouseholdId = user?.resident?.household?.id;

      if (!ownHouseholdId) {
        throw new ForbiddenException(
          'You must be linked to a household to delete residents.',
        );
      }

      if (resident.householdId !== ownHouseholdId) {
        throw new ForbiddenException(
          'You can only delete residents in your own household.',
        );
      }
    }

    if (resident.user) {
      await this.deactivateLinkedAccount(resident.user);
    }

    await this.prisma.resident.update({
      where: {
        id,
      },
      data: {
        status: ResidentStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Resident deleted successfully.',
    };
  }
}
