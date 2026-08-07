import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Request() req: any, @Body() dto: RegisterDto) {
    return this.authService.register(dto, req.ip, req.headers?.['user-agent']);
  }

  @Post('login')
  login(@Request() req: any, @Body() dto: LoginDto) {
    return this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers?.['user-agent'],
    );
  }

  @Post('refresh')
  refresh(@Request() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.refresh(
      dto.refreshToken,
      req.ip,
      req.headers?.['user-agent'],
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Request() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(req.user.account.id, dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return this.authService.profile(req.user);
  }
}
