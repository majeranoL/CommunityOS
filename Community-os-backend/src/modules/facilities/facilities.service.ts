import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { FacilityStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilityQueryDto } from './dto/facility-query.dto';

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Facility
  // ==========================================

  async create(communityId: string, dto: CreateFacilityDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.name = dto.name.trim();
    dto.description = dto.description?.trim();
    dto.location = dto.location?.trim();
    dto.imageUrl = dto.imageUrl?.trim();

    // ==========================================
    // Duplicate Name
    // ==========================================

    const existing = await this.prisma.facility.findFirst({
      where: {
        communityId,
        name: dto.name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Facility already exists.');
    }

    // ==========================================
    // Create Facility
    // ==========================================

    const facility = await this.prisma.facility.create({
      data: {
        communityId,

        name: dto.name,
        type: dto.type,

        description: dto.description,
        location: dto.location,
        capacity: dto.capacity,
        imageUrl: dto.imageUrl,
        hourlyRate: dto.hourlyRate,

        status: dto.status ?? FacilityStatus.AVAILABLE,
      },

      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        location: true,
        capacity: true,
        imageUrl: true,
        hourlyRate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Facility created successfully.',
      data: facility,
    };
  }

  // ==========================================
  // Get All Facilities
  // ==========================================

  async findAll(communityId: string, query: FacilityQueryDto) {
    const { page, limit, search, type, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [facilities, total] = await this.prisma.$transaction([
      this.prisma.facility.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          location: true,
          capacity: true,
          imageUrl: true,
          hourlyRate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.facility.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Facilities retrieved successfully.',
      data: facilities,

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
  // Get Facility By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const facility = await this.prisma.facility.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        location: true,
        capacity: true,
        imageUrl: true,
        hourlyRate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found.');
    }

    return {
      success: true,
      message: 'Facility retrieved successfully.',
      data: facility,
    };
  }

  // ==========================================
  // Update Facility
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateFacilityDto) {
    const facility = await this.prisma.facility.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.name) dto.name = dto.name.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.location) dto.location = dto.location.trim();

    if (dto.imageUrl) dto.imageUrl = dto.imageUrl.trim();

    // ==========================================
    // Duplicate Name
    // ==========================================

    if (dto.name) {
      const existing = await this.prisma.facility.findFirst({
        where: {
          communityId,
          name: dto.name,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Facility already exists.');
      }
    }

    // ==========================================
    // Update Facility
    // ==========================================

    const updatedFacility = await this.prisma.facility.update({
      where: {
        id,
      },

      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.location !== undefined && {
          location: dto.location,
        }),

        ...(dto.capacity !== undefined && {
          capacity: dto.capacity,
        }),

        ...(dto.imageUrl !== undefined && {
          imageUrl: dto.imageUrl,
        }),

        ...(dto.hourlyRate !== undefined && {
          hourlyRate: dto.hourlyRate,
        }),

        ...(dto.status && { status: dto.status }),
      },

      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        location: true,
        capacity: true,
        imageUrl: true,
        hourlyRate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Facility updated successfully.',
      data: updatedFacility,
    };
  }

  // ==========================================
  // Delete Facility (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const facility = await this.prisma.facility.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found.');
    }

    await this.prisma.facility.update({
      where: {
        id,
      },

      data: {
        status: FacilityStatus.CLOSED,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Facility deleted successfully.',
    };
  }
}
