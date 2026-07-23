import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';

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

    dto.remarks = dto.remarks?.trim();

    // ==========================
    // Validate Birth Date
    // ==========================

    if (
      dto.birthDate &&
      new Date(dto.birthDate) > new Date()
    ) {
      throw new BadRequestException(
        'Birth date cannot be in the future.',
      );
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
        // Generate Resident Number

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

        const resident = await tx.resident.create({
          data: {
            communityId,
            residentNumber,
            ...dto,
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

        // Future:
        // await tx.auditLog.create({
        //   data: {
        //     ...
        //   }
        // });

        return resident;
      },
    );

    return {
      success: true,
      message: 'Resident created successfully.',
      data: resident,
    };
  }
}