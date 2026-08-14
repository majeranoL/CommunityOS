import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PetStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FeaturesService } from '../features/features.service';

import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { VerifyPetDto } from './dto/verify-pet.dto';
import { PetQueryDto } from './dto/pet-query.dto';

const PET_FEATURE = 'pet-registration';

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

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

  private async getFeatureConfig(communityId: string) {
    return this.featuresService.getConfig(communityId, PET_FEATURE);
  }

  private async getVerificationMode(communityId: string) {
    const config = await this.getFeatureConfig(communityId);
    const mode = (config as { verificationMode?: string }).verificationMode;
    return mode ?? 'auto';
  }

  private async areDocumentsRequired(communityId: string) {
    const config = await this.getFeatureConfig(communityId);
    return (
      (config as { documentsRequired?: boolean }).documentsRequired === true
    );
  }

  // ==========================================
  // Create Pet
  // ==========================================

  async create(communityId: string, user: any, dto: CreatePetDto) {
    // ==========================================
    // Feature Gate
    // ==========================================

    await this.featuresService.assertEnabled(communityId, PET_FEATURE);

    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.name = dto.name.trim();
    dto.breed = dto.breed?.trim();
    dto.sex = dto.sex?.trim();
    dto.color = dto.color?.trim();
    dto.photoUrl = dto.photoUrl?.trim();
    dto.registrationNumber = dto.registrationNumber?.trim();
    dto.microchipNumber = dto.microchipNumber?.trim();
    dto.vaccinationCertificateUrl = dto.vaccinationCertificateUrl?.trim();
    dto.rabiesCertificateUrl = dto.rabiesCertificateUrl?.trim();
    dto.veterinaryCertificateUrl = dto.veterinaryCertificateUrl?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Birth Date
    // ==========================================

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

    // ==========================================
    // Self-Service Scope
    // ==========================================

    const permissions = this.getPermissionCodes(user);

    const isOfficer = permissions.includes('pet.verify');

    let petStatus: PetStatus = dto.status ?? PetStatus.ACTIVE;

    if (!isOfficer) {
      const ownHousehold = user?.resident?.household;

      if (!ownHousehold?.id) {
        throw new ForbiddenException(
          'You must be linked to a household to register a pet.',
        );
      }

      dto.householdId = ownHousehold.id;

      if (!dto.residentId) {
        dto.residentId = user?.resident?.id;
      }

      const verificationMode = await this.getVerificationMode(communityId);

      if (verificationMode === 'approval') {
        petStatus = PetStatus.PENDING;
      }

      // ==========================================
      // Required Documents (HOA policy)
      // ==========================================

      if (await this.areDocumentsRequired(communityId)) {
        if (
          !dto.vaccinationCertificateUrl ||
          !dto.rabiesCertificateUrl ||
          !dto.veterinaryCertificateUrl
        ) {
          throw new BadRequestException(
            'This community requires vaccination, rabies, and veterinary certificates for pet registration.',
          );
        }
      }
    }

    // ==========================================
    // Validate Household
    // ==========================================

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

    // ==========================================
    // Validate Caretaker Resident
    // ==========================================

    if (dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }

      if (!isOfficer && dto.householdId !== resident.householdId) {
        throw new ForbiddenException(
          'Caretaker must be a resident of your household.',
        );
      }

      if (!dto.householdId && resident.householdId) {
        dto.householdId = resident.householdId;
      }
    }

    if (!dto.householdId) {
      throw new BadRequestException(
        'A household is required to register a pet.',
      );
    }

    const householdId = dto.householdId;

    // ==========================================
    // Transaction
    // ==========================================

    const pet = await this.prisma.$transaction(async (tx) => {
      // Latest Pet Number

      const latestPet = await tx.pet.findFirst({
        where: {
          communityId,
        },
        orderBy: {
          petNumber: 'desc',
        },
        select: {
          petNumber: true,
        },
      });

      let petNumber = 'PET-000001';

      if (latestPet) {
        const latestNumber = Number(latestPet.petNumber.replace('PET-', ''));

        petNumber = `PET-${String(latestNumber + 1).padStart(6, '0')}`;
      }

      // Extra Safety

      const duplicatePet = await tx.pet.findFirst({
        where: {
          communityId,
          petNumber,
        },
      });

      if (duplicatePet) {
        throw new ConflictException('Pet number already exists.');
      }

      // Create Pet

      return tx.pet.create({
        data: {
          communityId,
          petNumber,

          householdId,
          residentId: dto.residentId,

          name: dto.name,
          species: dto.species ?? 'DOG',
          breed: dto.breed,
          sex: dto.sex,
          color: dto.color,
          birthDate,

          photoUrl: dto.photoUrl,
          registrationNumber: dto.registrationNumber,
          microchipNumber: dto.microchipNumber,

          vaccinationCertificateUrl: dto.vaccinationCertificateUrl,
          rabiesCertificateUrl: dto.rabiesCertificateUrl,
          veterinaryCertificateUrl: dto.veterinaryCertificateUrl,

          remarks: dto.remarks,

          status: petStatus,
        },

        include: {
          household: {
            select: {
              id: true,
              block: true,
              lot: true,
              unit: true,
              address: true,
            },
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    return {
      success: true,
      message: 'Pet registered successfully.',
      data: pet,
    };
  }

  // ==========================================
  // Get All Pets
  // ==========================================

  async findAll(communityId: string, user: any, query: PetQueryDto) {
    const {
      page,
      limit,
      search,
      species,
      status,
      householdId,
      residentId,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const permissions = this.getPermissionCodes(user);

    const isOfficer = permissions.includes('pet.verify');

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Non-officer scope: own household only

    if (!isOfficer) {
      const ownHouseholdId = user?.resident?.household?.id;

      if (!ownHouseholdId) {
        return {
          success: true,
          message: 'Pets retrieved successfully.',
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }

      where.householdId = ownHouseholdId;
    }

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
          breed: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          registrationNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          resident: {
            OR: [
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
            ],
          },
        },
      ];
    }

    if (species) {
      where.species = species;
    }

    if (status) {
      where.status = status;
    }

    if (householdId) {
      where.householdId = householdId;
    }

    if (residentId) {
      where.residentId = residentId;
    }

    const [pets, total] = await this.prisma.$transaction([
      this.prisma.pet.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          household: {
            select: {
              id: true,
              block: true,
              lot: true,
              unit: true,
              address: true,
            },
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.pet.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Pets retrieved successfully.',
      data: pets,

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
  // Get Pet By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    return {
      success: true,
      message: 'Pet retrieved successfully.',
      data: pet,
    };
  }

  // ==========================================
  // Update Pet
  // ==========================================

  async update(communityId: string, id: string, dto: UpdatePetDto) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.name) dto.name = dto.name.trim();

    if (dto.breed) dto.breed = dto.breed.trim();

    if (dto.sex) dto.sex = dto.sex.trim();

    if (dto.color) dto.color = dto.color.trim();

    if (dto.photoUrl) dto.photoUrl = dto.photoUrl.trim();

    if (dto.registrationNumber)
      dto.registrationNumber = dto.registrationNumber.trim();

    if (dto.microchipNumber) dto.microchipNumber = dto.microchipNumber.trim();

    if (dto.vaccinationCertificateUrl)
      dto.vaccinationCertificateUrl = dto.vaccinationCertificateUrl.trim();

    if (dto.rabiesCertificateUrl)
      dto.rabiesCertificateUrl = dto.rabiesCertificateUrl.trim();

    if (dto.veterinaryCertificateUrl)
      dto.veterinaryCertificateUrl = dto.veterinaryCertificateUrl.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Birth Date
    // ==========================================

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

    // ==========================================
    // Validate Household
    // ==========================================

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

    // ==========================================
    // Validate Caretaker Resident
    // ==========================================

    if (dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // ==========================================
    // Update Pet
    // ==========================================

    const updatedPet = await this.prisma.pet.update({
      where: {
        id,
      },

      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.species && { species: dto.species }),

        ...(dto.breed !== undefined && { breed: dto.breed }),
        ...(dto.sex !== undefined && { sex: dto.sex }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.birthDate !== undefined && { birthDate }),

        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.registrationNumber !== undefined && {
          registrationNumber: dto.registrationNumber,
        }),
        ...(dto.microchipNumber !== undefined && {
          microchipNumber: dto.microchipNumber,
        }),

        ...(dto.vaccinationCertificateUrl !== undefined && {
          vaccinationCertificateUrl: dto.vaccinationCertificateUrl,
        }),
        ...(dto.rabiesCertificateUrl !== undefined && {
          rabiesCertificateUrl: dto.rabiesCertificateUrl,
        }),
        ...(dto.veterinaryCertificateUrl !== undefined && {
          veterinaryCertificateUrl: dto.veterinaryCertificateUrl,
        }),

        ...(dto.remarks !== undefined && { remarks: dto.remarks }),

        ...(dto.householdId !== undefined && {
          householdId: dto.householdId,
        }),
        ...(dto.residentId !== undefined && { residentId: dto.residentId }),

        ...(dto.status && { status: dto.status }),
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Pet updated successfully.',
      data: updatedPet,
    };
  }

  // ==========================================
  // Verify Pending Pet
  // ==========================================

  async verify(
    communityId: string,
    verifierId: string,
    id: string,
    dto: VerifyPetDto,
  ) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    if (pet.status !== PetStatus.PENDING) {
      throw new BadRequestException('Only pending pets can be verified.');
    }

    const updatedPet = await this.prisma.pet.update({
      where: {
        id,
      },
      data: {
        status: dto.approved ? PetStatus.APPROVED : PetStatus.REJECTED,
        verifiedById: verifierId,
        verifiedAt: new Date(),
        verificationRemarks: dto.remarks,
      },
      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: dto.approved
        ? 'Pet approved successfully.'
        : 'Pet rejected successfully.',
      data: updatedPet,
    };
  }

  // ==========================================
  // Deactivate Pet
  // ==========================================

  async deactivate(communityId: string, id: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    const activeStatuses: PetStatus[] = [PetStatus.ACTIVE, PetStatus.APPROVED];

    if (!activeStatuses.includes(pet.status)) {
      throw new BadRequestException('Only active pets can be deactivated.');
    }

    const updatedPet = await this.prisma.pet.update({
      where: {
        id,
      },
      data: {
        status: PetStatus.DEACTIVATED,
      },
      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Pet deactivated successfully.',
      data: updatedPet,
    };
  }

  // ==========================================
  // Revalidate Pet (re-activate)
  // ==========================================

  async revalidate(communityId: string, id: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    if (pet.status !== PetStatus.DEACTIVATED) {
      throw new BadRequestException(
        'Only deactivated pets can be revalidated.',
      );
    }

    const updatedPet = await this.prisma.pet.update({
      where: {
        id,
      },
      data: {
        status: PetStatus.ACTIVE,
      },
      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
            address: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Pet revalidated successfully.',
      data: updatedPet,
    };
  }

  // ==========================================
  // Delete Pet (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    await this.prisma.pet.update({
      where: {
        id,
      },

      data: {
        status: PetStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Pet deleted successfully.',
    };
  }
}
