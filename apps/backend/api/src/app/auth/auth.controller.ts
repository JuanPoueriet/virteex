
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
  Ip,
  Headers,
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
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { EnableTwoFactorDto } from './dto/enable-2fa.dto';

@ApiTags('Auth')
@Controller('auth')
@UseFilters(TypeOrmExceptionFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly cookieService: CookieService
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request & { user: any }, @Res() res: Response) {
      await this.handleSocialCallback(req.user, res);
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuth(@Req() req) {}

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuthRedirect(@Req() req: Request & { user: any }, @Res() res: Response) {
      await this.handleSocialCallback(req.user, res);
  }

  @Get('okta')
  @UseGuards(AuthGuard('okta'))
  async oktaAuth(@Req() req) {}

  @Get('okta/callback')
  @UseGuards(AuthGuard('okta'))
  async oktaAuthRedirect(@Req() req: Request & { user: any }, @Res() res: Response) {
      await this.handleSocialCallback(req.user, res);
  }

  private async handleSocialCallback(socialUser: any, res: Response) {
    const { user, tokens } = await this.authService.validateOAuthLogin(socialUser);

    if (!user) {
        // Redirect to registration with pre-filled data
        const params = new URLSearchParams({
            email: socialUser.email,
            firstName: socialUser.firstName,
            lastName: socialUser.lastName,
            provider: socialUser.provider
        });
        return res.redirect(`${this.configService.get('FRONTEND_URL')}/auth/register?${params.toString()}`);
    }

    // Login successful
    this.cookieService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard`);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @UseGuards(GoogleRecaptchaGuard)
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<{ user: any; accessToken: string }> {
    const { user, accessToken, refreshToken } =
      await this.authService.register(registerUserDto, ip, userAgent);

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
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<{ user: any }> {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginUserDto, ip, userAgent);
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
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<{ accessToken: string; user: any }> {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token no encontrado en cookies');
    }

    const { accessToken, user } =
      await this.authService.refreshAccessToken(refreshToken, ip, userAgent);

    // For refresh, we update access token.
    // The service now returns new tokens if rotated, but let's assume it returns accessToken and user at minimum.
    // If authService returns refreshToken too (it does), we should update cookie.

    // Actually authService returns { accessToken, refreshToken, user } now.
    // Let's typecast safely or update logic.
    // Wait, in previous step I updated refreshAccessToken to return { user, accessToken, refreshToken }.
    // So I can just use it.

    // Wait, the destructuring was: `const { accessToken, user } = ...`. I should add refreshToken.
    // However, the original code had `const { accessToken, user }` only. I must check what I changed in AuthService.
    // In AuthService: `return { user: authResponse.user, accessToken: ..., refreshToken: ... };`
    // So I can get refreshToken.

    const result = await this.authService.refreshAccessToken(refreshToken, ip, userAgent);

    this.cookieService.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { accessToken: result.accessToken, user: result.user };
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

  // ------------------------------------------------------------------
  // Two-Factor Authentication (MFA)
  // ------------------------------------------------------------------

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate 2FA secret and QR code URL' })
  async generateTwoFactorSecret(@CurrentUser() user: User) {
    return this.authService.generateTwoFactorSecret(user);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify token and enable 2FA' })
  async enableTwoFactor(
    @CurrentUser() user: User,
    @Body() enableTwoFactorDto: EnableTwoFactorDto,
  ) {
    return this.authService.enableTwoFactor(user, enableTwoFactorDto.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disableTwoFactor(@CurrentUser() user: User) {
    return this.authService.disableTwoFactor(user);
  }

  // ------------------------------------------------------------------
  // Session Management
  // ------------------------------------------------------------------

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active sessions (devices)' })
  async getUserSessions(@CurrentUser() user: User) {
    return this.authService.getUserSessions(user.id);
  }

  @Post('sessions/:id/revoke') // Using POST or DELETE is fine, usually DELETE for resource removal
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser() user: User,
    @Param('id') sessionId: string,
  ) {
    return this.authService.revokeSession(user.id, sessionId);
  }
}
