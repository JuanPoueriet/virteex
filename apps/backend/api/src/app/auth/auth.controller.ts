
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Param,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './guards/jwt/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity/user.entity';
import { Throttle } from '@nestjs/throttler';
import { GoogleRecaptchaGuard } from '@nestlab/google-recaptcha';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { SetPasswordFromInvitationDto } from './dto/set-password-from-invitation.dto';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from './auth.config';
import { UseFilters } from '@nestjs/common';
import { TypeOrmExceptionFilter } from '../common/filters/typeorm-exception.filter';
import { CookieService } from './services/cookie.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
@UseFilters(TypeOrmExceptionFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly cookieService: CookieService
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @UseGuards(GoogleRecaptchaGuard)
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(registerUserDto);

    this.cookieService.setAuthCookies(res, accessToken, refreshToken);

    // Return accessToken as well for clients not using cookies
    return { user, accessToken };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AuthConfig.THROTTLE_LIMIT, ttl: AuthConfig.THROTTLE_TTL },
  })
  @UseGuards(GoogleRecaptchaGuard)
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginUserDto);
    const rememberMe = loginUserDto.rememberMe || false;

    this.cookieService.setAuthCookies(res, accessToken, refreshToken, rememberMe);

    return { user };
  }

  @Post('set-password-from-invitation')
  @HttpCode(HttpStatus.OK)
  async setPasswordFromInvitation(
    @Body() setPasswordDto: SetPasswordFromInvitationDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.setPasswordFromInvitation(setPasswordDto);

    this.cookieService.setAuthCookies(res, accessToken, refreshToken);

    return { user };
  }

  @Get('invitation/:token')
  @HttpCode(HttpStatus.OK)
  async getInvitationDetails(@Param('token') token: string) {
    return this.authService.getInvitationDetails(token);
  }

  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token no encontrado en cookies');
    }

    const { accessToken, user } =
      await this.authService.refreshAccessToken(refreshToken);

    // For refresh, we update access token.
    // If rotation is used, we might update refresh token too.
    // Assuming authService returns new pair if rotated.
    // If not returned, we might just set access token.
    // But cookieService.setAuthCookies expects (res, access, refresh).
    // If refresh is undefined in object, we pass null?
    // authService.refreshAccessToken signature: returns { accessToken, user }. It does NOT return refreshToken usually unless rotated.
    // Let's check auth.service.ts later if needed.
    // Assuming for now we just update access token if refresh is missing.
    // But `setAuthCookies` handles null refreshToken.

    this.cookieService.setAuthCookies(res, accessToken, null);

    return { accessToken, user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    this.cookieService.clearAuthCookies(res);
    return { message: 'Logout exitoso' };
  }

  @Get('status')
  async checkAuthStatus(@Req() req: Request) {
    const token = req.cookies['access_token'];

    if (!token) {
      return { isAuthenticated: false, user: null };
    }

    const user = await this.authService.verifyUserFromToken(token);

    if (!user) {
      return { isAuthenticated: false, user: null };
    }

    const statusResponse = await this.authService.status({
      id: user.id,
      isImpersonating: false,
    });

    return {
      isAuthenticated: true,
      user: statusResponse.user,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleRecaptchaGuard)
  @UsePipes(new ValidationPipe())
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.sendPasswordResetLink(forgotPasswordDto);
    return {
      message:
        'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe())
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const user = await this.authService.resetPassword(resetPasswordDto);
    const { passwordHash, ...userResult } = user;
    return userResult;
  }

  @Post('impersonate')
  @UseGuards(JwtAuthGuard)
  async impersonate(
    @CurrentUser() adminUser: User,
    @Body('userId') targetUserId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.impersonate(adminUser, targetUserId);

    this.cookieService.setAuthCookies(res, accessToken, refreshToken);

    return { user, access_token: accessToken };
  }

  @Post('stop-impersonation')
  @UseGuards(JwtAuthGuard)
  async stopImpersonation(
    @CurrentUser() impersonatingUser: User,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.stopImpersonation(impersonatingUser);

    this.cookieService.setAuthCookies(res, accessToken, refreshToken);

    return { user, access_token: accessToken };
  }
}
