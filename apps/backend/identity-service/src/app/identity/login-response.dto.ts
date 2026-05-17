import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUser } from './authenticated-user.interface';
import { User } from './user.entity';

export class LoginResponseDto {
    @ApiProperty({ type: () => User })
    user: AuthenticatedUser;

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string;

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    refreshToken: string;

    @ApiProperty({ example: 'uuid-string' })
    refreshTokenId: string;
}

export class TwoFactorRequiredResponseDto {
    @ApiProperty({ example: true })
    require2fa: boolean;

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    tempToken: string;

    @ApiProperty({ example: '2FA verification required' })
    message: string;
}

export type LoginResultDto = LoginResponseDto | TwoFactorRequiredResponseDto;
