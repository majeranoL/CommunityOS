import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return this.authService.profile(req.user);
  }
}
