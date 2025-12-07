
import { User } from '../../../shared/interfaces/user.interface';

export interface LoginUserDto {
    email: string;
    password?: string; // Optional for passkey flows if needed, but strictly required for password login
    rememberMe?: boolean;
    recaptchaToken: string;
    twoFactorCode?: string;
}

export interface RegisterUserDto {
    organizationName: string;
    taxId?: string;
    fiscalRegionId: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    recaptchaToken: string;
    industry?: string;
    companySize?: string;
    address?: string;
    fax?: string; // Honeypot
}

export interface AuthenticatedUser extends User {
    // Add specific auth properties if any different from shared User
}

export interface LoginResponseDto {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
    refreshTokenId: string;
}

export interface TwoFactorRequiredResponseDto {
    require2fa: boolean;
    tempToken: string;
    message: string;
}

export type LoginResult = LoginResponseDto | TwoFactorRequiredResponseDto;

export interface AuthErrorResponse {
    statusCode: number;
    message: string | string[];
    error: string;
}
