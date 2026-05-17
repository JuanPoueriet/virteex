import { Controller, Post, Body, Req, Get, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoginUserDto } from './login-user.dto';
import { IAuthService } from './identity.interfaces';
import { AUTH_SERVICE_TOKEN } from './identity.constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE_TOKEN)
    private readonly authService: IAuthService,
    private readonly registrationService: RegistrationService
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @Post('register')
  @ApiOperation({ summary: 'Register user' })
  async register(@Body() registerDto: any) {
    return this.registrationService.register(registerDto);
  }

  async login(@Body() loginUserDto: LoginUserDto, @Req() req: any) {
    return this.authService.login(loginUserDto, req.ip, req.headers['user-agent']);
  }
}
