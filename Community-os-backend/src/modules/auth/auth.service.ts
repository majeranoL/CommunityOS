import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
constructor(
  private readonly usersService: UsersService,
  private readonly jwtService: JwtService,
) {}

async login(email: string, password: string) {
  const account = await this.usersService.findByEmail(email);

  if (!account) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isValid = await bcrypt.compare(
    password,
    account.passwordHash,
  );

if (!account.user) {
  throw new UnauthorizedException('Account has no user profile');
}
  const user = account.user;

const payload = {
  sub: user.id,
  email: account.email,
  communityId: user.community.id,
};

const accessToken = await this.jwtService.signAsync(payload);

return {
    accessToken,
    user: {
      id: user.id,
      referenceNumber: user.referenceNumber,

      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,

      email: account.email,

      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,

      community: {
        id: user.community.id,
        code: user.community.code,
        slug: user.community.slug,
        displayName: user.community.displayName,
      },

      roles: user.roles.map(r => r.role.name),
    },
  };
}
}