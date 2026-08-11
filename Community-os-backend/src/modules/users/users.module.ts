import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN! as StringValue,
      },
    }),
  ],

  controllers: [UsersController],

  providers: [UsersService],

  exports: [UsersService],
})
export class UsersModule {}
