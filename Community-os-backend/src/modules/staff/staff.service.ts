import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { StaffStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffQueryDto } from './dto/staff-query.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Staff
  // ==========================================

  async create(communityId: string, dto: CreateStaffDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.staffNumber = dto.staffNumber.trim();
    dto.firstName = dto.firstName.trim();
    dto.middleName = dto.middleName?.trim();
    dto.lastName = dto.lastName.trim();
    dto.phoneNumber = dto.phoneNumber?.trim();
    dto.email = dto.email?.trim().toLowerCase();
    dto.notes = dto.notes?.trim();

    // ==========================================
    // Duplicate Staff Number
    // ==========================================

    const existing = await this.prisma.staff.findFirst({
      where: {
        communityId,
        staffNumber: dto.staffNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Staff already exists.');
    }

    // ==========================================
    // Create Staff
    // ==========================================

    const staff = await this.prisma.staff.create({
      data: {
        communityId,

        staffNumber: dto.staffNumber,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,

        role: dto.role ?? 'SECURITY',
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        notes: dto.notes,

        status: dto.status ?? StaffStatus.ACTIVE,
      },

      select: {
        id: true,
        staffNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        email: true,
        hireDate: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Staff created successfully.',
      data: staff,
    };
  }

  // ==========================================
  // Get All Staff
  // ==========================================

  async findAll(communityId: string, query: StaffQueryDto) {
    const { page, limit, search, role, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          staffNumber: {
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
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [staff, total] = await this.prisma.$transaction([
      this.prisma.staff.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          staffNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          role: true,
          phoneNumber: true,
          email: true,
          hireDate: true,
          notes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedMaintenances: true,
            },
          },
        },
      }),

      this.prisma.staff.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Staff retrieved successfully.',
      data: staff.map((member) => ({
        ...member,
        maintenanceCount: member._count.assignedMaintenances,
        _count: undefined,
      })),

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

  // ==========================================
  // Get Staff By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      select: {
        id: true,
        staffNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        email: true,
        hireDate: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        assignedMaintenances: {
          select: {
            id: true,
            maintenanceNumber: true,
            title: true,
            category: true,
            priority: true,
            status: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found.');
    }

    return {
      success: true,
      message: 'Staff retrieved successfully.',
      data: staff,
    };
  }

  // ==========================================
  // Update Staff
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.staffNumber) dto.staffNumber = dto.staffNumber.trim();

    if (dto.firstName) dto.firstName = dto.firstName.trim();

    if (dto.middleName) dto.middleName = dto.middleName.trim();

    if (dto.lastName) dto.lastName = dto.lastName.trim();

    if (dto.phoneNumber) dto.phoneNumber = dto.phoneNumber.trim();

    if (dto.email) dto.email = dto.email.trim().toLowerCase();

    if (dto.notes) dto.notes = dto.notes.trim();

    // ==========================================
    // Duplicate Staff Number
    // ==========================================

    if (dto.staffNumber) {
      const existing = await this.prisma.staff.findFirst({
        where: {
          communityId,
          staffNumber: dto.staffNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Staff already exists.');
      }
    }

    // ==========================================
    // Update Staff
    // ==========================================

    const updatedStaff = await this.prisma.staff.update({
      where: {
        id,
      },

      data: {
        ...(dto.staffNumber && {
          staffNumber: dto.staffNumber,
        }),

        ...(dto.firstName && {
          firstName: dto.firstName,
        }),

        ...(dto.middleName !== undefined && {
          middleName: dto.middleName,
        }),

        ...(dto.lastName && {
          lastName: dto.lastName,
        }),

        ...(dto.role && { role: dto.role }),

        ...(dto.phoneNumber !== undefined && {
          phoneNumber: dto.phoneNumber,
        }),

        ...(dto.email !== undefined && {
          email: dto.email,
        }),

        ...(dto.hireDate && {
          hireDate: new Date(dto.hireDate),
        }),

        ...(dto.notes !== undefined && {
          notes: dto.notes,
        }),

        ...(dto.status && { status: dto.status }),
      },

      select: {
        id: true,
        staffNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        email: true,
        hireDate: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Staff updated successfully.',
      data: updatedStaff,
    };
  }

  // ==========================================
  // Delete Staff (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found.');
    }

    await this.prisma.staff.update({
      where: {
        id,
      },

      data: {
        status: StaffStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Staff deleted successfully.',
    };
  }
}
