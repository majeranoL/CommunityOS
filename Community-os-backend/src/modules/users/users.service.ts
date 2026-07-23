import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.account.findUnique({
      where: {
        email,
      },
      include: {
        user: {
          include: {
            community: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
  return this.prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      community: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      account: true,
    },
  });
}
}