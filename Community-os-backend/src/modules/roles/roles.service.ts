import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

    async create(
    communityId: string,
    dto: CreateRoleDto,
    ) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.name = dto.name.trim();

    dto.description = dto.description?.trim();

    // ==========================================
    // Check Duplicate Role Name
    // ==========================================

    const existingRole =
        await this.prisma.role.findFirst({
        where: {
            communityId,
            name: dto.name,
            deletedAt: null,
        },
        });

    if (existingRole) {
        throw new ConflictException(
        'Role already exists.',
        );
    }

    // ==========================================
    // Create Role
    // ==========================================

    const role = await this.prisma.role.create({
        data: {
        communityId,

        name: dto.name,

        description: dto.description,

        isSystem: dto.isSystem ?? false,
        },

        select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        },
    });

    return {
        success: true,
        message: 'Role created successfully.',
        data: role,
    };
    }

    // ==========================================
    // Get All Roles
    // ==========================================

    async findAll(
    communityId: string,
    query: RoleQueryDto,
    ) {
    const {
        page,
        limit,
        search,
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
        ];
    }

    const [roles, total] =
        await this.prisma.$transaction([
        this.prisma.role.findMany({
            where,

            skip,
            take: limit,

            orderBy: {
            [sortBy]: order,
            },

            include: {
            _count: {
                select: {
                userRoles: true,
                permissions: true,
                },
            },
            },
        }),

        this.prisma.role.count({
            where,
        }),
        ]);

    return {
        success: true,

        data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,

        userCount: role._count.userRoles,
        permissionCount: role._count.permissions,

        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        })),

        pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage:
            page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        },
    };
    }

    // ==========================================
    // Get Role By ID
    // ==========================================

    async findOne(
    communityId: string,
    id: string,
    ) {
    const role = await this.prisma.role.findFirst({
        where: {
        id,
        communityId,
        deletedAt: null,
        },

        include: {
        permissions: {
            include: {
            permission: {
                select: {
                id: true,
                code: true,
                module: true,
                description: true,
                },
            },
            },
        },

        _count: {
            select: {
            userRoles: true,
            },
        },
        },
    });

    if (!role) {
        throw new NotFoundException(
        'Role not found.',
        );
    }

    return {
        success: true,
        message: 'Role retrieved successfully.',
        data: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,

        userCount: role._count.userRoles,

        permissions: role.permissions.map(
            (permission) => permission.permission,
        ),

        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        },
    };
    }

    // ==========================================
    // Update Role
    // ==========================================

    async update(
    communityId: string,
    id: string,
    dto: UpdateRoleDto,
    ) {
    const role = await this.prisma.role.findFirst({
        where: {
        id,
        communityId,
        deletedAt: null,
        },
    });

    if (!role) {
        throw new NotFoundException(
        'Role not found.',
        );
    }

    // Prevent duplicate role names
    if (dto.name) {
        const existingRole =
        await this.prisma.role.findFirst({
            where: {
            communityId,
            deletedAt: null,
            name: dto.name.trim(),
            NOT: {
                id,
            },
            },
        });

        if (existingRole) {
        throw new ConflictException(
            'Role already exists.',
        );
        }
    }

    const updatedRole =
        await this.prisma.role.update({
        where: {
            id,
        },

        data: {
            ...(dto.name && {
            name: dto.name.trim(),
            }),

            ...(dto.description !== undefined && {
            description:
                dto.description?.trim(),
            }),

            ...(dto.isSystem !== undefined && {
            isSystem: dto.isSystem,
            }),
        },

        select: {
            id: true,
            name: true,
            description: true,
            isSystem: true,
            createdAt: true,
            updatedAt: true,
        },
        });

    return {
        success: true,
        message: 'Role updated successfully.',
        data: updatedRole,
    };
    }

   // ==========================================
    // Assign Permissions
    // ==========================================

    async assignPermissions(
    communityId: string,
    roleId: string,
    permissionIds: string[],
    ) {
    // Check if role exists
    const role = await this.prisma.role.findFirst({
        where: {
        id: roleId,
        communityId,
        deletedAt: null,
        },
    });

    if (!role) {
        throw new NotFoundException(
        'Role not found.',
        );
    }

    // Validate permissions
    const permissions =
        await this.prisma.permission.findMany({
        where: {
            id: {
            in: permissionIds,
            },
            communityId,
        },
        });

    if (permissions.length !== permissionIds.length) {
        throw new NotFoundException(
        'One or more permissions were not found.',
        );
    }

    // Replace existing permissions
    await this.prisma.$transaction(
        async (prisma) => {
        // Remove old permissions
        await prisma.rolePermission.deleteMany({
            where: {
            roleId,
            },
        });

        // Assign new permissions
        await prisma.rolePermission.createMany({
            data: permissionIds.map(
            (permissionId) => ({
                roleId,
                permissionId,
            }),
            ),
        });
        },
    );

    // Return updated role
    const updatedRole =
        await this.prisma.role.findUnique({
        where: {
            id: roleId,
        },

        include: {
            permissions: {
            include: {
                permission: {
                select: {
                    id: true,
                    code: true,
                    module: true,
                    description: true,
                },
                },
            },
            },
        },
        });

    return {
        success: true,
        message:
        'Permissions assigned successfully.',
        data: {
        id: updatedRole?.id,
        name: updatedRole?.name,
        permissions:
            updatedRole?.permissions.map(
            (p) => p.permission,
            ),
        },
    };
}
    // ==========================================
    // Delete Role (Soft Delete)
    // ==========================================

    async remove(
    communityId: string,
    id: string,
    ) {
    const role = await this.prisma.role.findFirst({
        where: {
        id,
        communityId,
        deletedAt: null,
        },

        include: {
        _count: {
            select: {
            userRoles: true,
            },
        },
        },
    });

    if (!role) {
        throw new NotFoundException(
        'Role not found.',
        );
    }

    // Prevent deleting system roles
    if (role.isSystem) {
        throw new ConflictException(
        'System roles cannot be deleted.',
        );
    }

    // Prevent deleting assigned roles
    if (role._count.userRoles > 0) {
        throw new ConflictException(
        'Role cannot be deleted because it is assigned to one or more users.',
        );
    }

    await this.prisma.role.update({
        where: {
        id,
        },

        data: {
        deletedAt: new Date(),
        },
    });

    return {
        success: true,
        message: 'Role deleted successfully.',
    };
    }
}