import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { UpdateResidentDto } from './dto/update-resident.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { ResidentQueryDto } from './dto/resident-query.dto';
import { ResidentStatus } from '@prisma/client';

@Injectable()
export class ResidentService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private capitalize(value?: string) {
    if (!value) return value;

    return value
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async create(
    communityId: string,
    dto: CreateResidentDto,
  ) {
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
        throw new BadRequestException(
          'Invalid birth date.',
        );
      }

      if (birthDate > new Date()) {
        throw new BadRequestException(
          'Birth date cannot be in the future.',
        );
      }
    }

    // ==========================
    // Duplicate Email
    // ==========================

    if (dto.email) {
      const existingEmail =
        await this.prisma.resident.findFirst({
          where: {
            communityId,
            email: dto.email,
            deletedAt: null,
          },
        });

      if (existingEmail) {
        throw new ConflictException(
          'Email already exists.',
        );
      }
    }

    // ==========================
    // Duplicate Phone
    // ==========================

    if (dto.phoneNumber) {
      const existingPhone =
        await this.prisma.resident.findFirst({
          where: {
            communityId,
            phoneNumber: dto.phoneNumber,
            deletedAt: null,
          },
        });

      if (existingPhone) {
        throw new ConflictException(
          'Phone number already exists.',
        );
      }
    }

    // ==========================
    // Transaction
    // ==========================

    const resident = await this.prisma.$transaction(
      async (tx) => {
        // Latest Resident Number

        const latestResident =
          await tx.resident.findFirst({
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
            latestResident.residentNumber.replace(
              'RES-',
              '',
            ),
          );

          residentNumber = `RES-${String(
            latestNumber + 1,
          ).padStart(6, '0')}`;
        }

        // Extra Safety

        const duplicateResident =
          await tx.resident.findUnique({
            where: {
              residentNumber,
            },
          });

        if (duplicateResident) {
          throw new ConflictException(
            'Resident number already exists.',
          );
        }

        // Create Resident

        return tx.resident.create({
          data: {
            communityId,

            residentNumber,

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
          },

          select: {
            id: true,
            residentNumber: true,

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

            createdAt: true,
            updatedAt: true,
          },
        });
      },
    );

    return {
      success: true,
      message: 'Resident created successfully.',
      data: resident,
    };
  }
  async findAll(
    communityId: string,
    query: ResidentQueryDto,
  ) {
    const {
      page,
      limit,
      search,
      status,
      gender,
      sortBy,
      order,
    } = query;

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

    const [residents, total] =
      await this.prisma.$transaction([
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

            status: true,

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
  async findOne(
  communityId: string,
  residentId: string,
) {
  const resident = await this.prisma.resident.findFirst({
    where: {
      id: residentId,
      communityId,
      deletedAt: null,
    },

    select: {
      id: true,

      residentNumber: true,

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

      createdAt: true,
      updatedAt: true,
    },
  });

  if (!resident) {
    throw new NotFoundException(
      'Resident not found.',
    );
  }

  return {
    success: true,
    message: 'Resident retrieved successfully.',
    data: resident,
  };
  }
  async update(
  communityId: string,
  id: string,
  dto: UpdateResidentDto,
) {
  const resident = await this.prisma.resident.findFirst({
    where: {
      id,
      communityId,
      deletedAt: null,
    },
  });

  if (!resident) {
    throw new NotFoundException(
      'Resident not found.',
    );
  }

  // ==========================
  // Clean Inputs
  // ==========================

  if (dto.firstName)
    dto.firstName = this.capitalize(dto.firstName)!;

  if (dto.middleName)
    dto.middleName = this.capitalize(dto.middleName);

  if (dto.lastName)
    dto.lastName = this.capitalize(dto.lastName)!;

  if (dto.suffix)
    dto.suffix = dto.suffix.trim().toUpperCase();

  if (dto.email)
    dto.email = dto.email.trim().toLowerCase();

  if (dto.phoneNumber)
    dto.phoneNumber = dto.phoneNumber.trim();

  if (dto.block)
    dto.block = dto.block.trim();

  if (dto.lot)
    dto.lot = dto.lot.trim();

  if (dto.street)
    dto.street = dto.street.trim();

  if (dto.address)
    dto.address = dto.address.trim();

  if (dto.profilePhotoUrl)
    dto.profilePhotoUrl =
      dto.profilePhotoUrl.trim();

  if (dto.remarks)
    dto.remarks = dto.remarks.trim();

  // ==========================
  // Birth Date
  // ==========================

  let birthDate: Date | undefined;

  if (dto.birthDate) {
    birthDate = new Date(dto.birthDate);

    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException(
        'Invalid birth date.',
      );
    }

    if (birthDate > new Date()) {
      throw new BadRequestException(
        'Birth date cannot be in the future.',
      );
    }
  }

  // ==========================
  // Duplicate Email
  // ==========================

  if (dto.email) {
    const existing =
      await this.prisma.resident.findFirst({
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
      throw new ConflictException(
        'Email already exists.',
      );
    }
  }

  // ==========================
  // Duplicate Phone
  // ==========================

  if (dto.phoneNumber) {
    const existing =
      await this.prisma.resident.findFirst({
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
      throw new ConflictException(
        'Phone number already exists.',
      );
    }
  }

  // ==========================
  // Update Resident
  // ==========================

  const updatedResident =
    await this.prisma.resident.update({
      where: {
        id,
      },

      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        suffix: dto.suffix,

        birthDate:
          birthDate ?? resident.birthDate,

        gender: dto.gender,
        civilStatus: dto.civilStatus,

        phoneNumber: dto.phoneNumber,
        email: dto.email,

        block: dto.block,
        lot: dto.lot,
        street: dto.street,
        address: dto.address,

        profilePhotoUrl:
          dto.profilePhotoUrl,

        remarks: dto.remarks,

        status: dto.status,
      },

      select: {
        id: true,
        residentNumber: true,

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
  async remove(
  communityId: string,
  id: string,
) {
  const resident =
    await this.prisma.resident.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

  if (!resident) {
    throw new NotFoundException(
      'Resident not found.',
    );
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