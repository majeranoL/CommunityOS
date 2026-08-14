import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import {
  clearRefreshTokenCookie,
  getRefreshToken,
  setRefreshTokenCookie,
} from './auth-cookies';

import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

const AUTH_RATE_LIMIT =
  process.env.THROTTLE_DISABLED === 'true' ? 1_000_000 : 5;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private applySession(res: Response, result: any) {
    const data = result?.data;

    if (data && data.refreshToken) {
      setRefreshTokenCookie(res, data.refreshToken);
      delete data.refreshToken;
    }

    return result;
  }

  @Post('otp/send')
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendRegistrationOtp(dto);
  }

  @Post('register')
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  login(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    return this.authService
      .login(dto.email, dto.password, req.ip, req.headers?.['user-agent'])
      .then((result) => this.applySession(res, result));
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  refresh(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ) {
    const refreshToken = getRefreshToken(req) ?? dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return this.authService
      .refresh(refreshToken, req.ip, req.headers?.['user-agent'])
      .then((result) => this.applySession(res, result));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ) {
    const refreshToken = getRefreshToken(req) ?? dto.refreshToken;
    clearRefreshTokenCookie(res);

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return this.authService.logout(req.user.account.id, refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    const refreshToken = getRefreshToken(req);

    return this.authService.changePassword(
      req.user.account.id,
      dto.currentPassword,
      dto.newPassword,
      refreshToken,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return this.authService.profile(req.user);
  }
}
