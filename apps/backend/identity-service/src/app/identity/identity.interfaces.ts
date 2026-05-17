
import { User, UserStatus } from './user.entity';
import { Role } from './role.entity';
import { LoginUserDto } from './login-user.dto';
import { LoginResultDto } from './login-response.dto';
import { JwtPayload } from './jwt-payload.interface';
import { AuthenticatedUser } from './authenticated-user.interface';
import { UpdateUserDto } from './update-user.dto';
import { UpdateProfileDto } from './update-profile.dto';
import { InviteUserDto } from './invite-user.dto';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDto } from './update-role.dto';

export interface IAuthService {
  login(loginUserDto: LoginUserDto & { twoFactorCode?: string }, ipAddress?: string, userAgent?: string): Promise<LoginResultDto>;
  validate(payload: JwtPayload): Promise<AuthenticatedUser>;
  refreshAccessToken(token: string, ipAddress?: string, userAgent?: string): Promise<any>;
  status(userFromJwt: AuthenticatedUser): Promise<any>;
  logout(userId: string): Promise<{ message: string }>;
  changePassword(userId: string, currentPass: string, newPass: string): Promise<void>;
}

export interface IUsersService {
  findOne(id: string): Promise<User>;
  findOneByEmail(email: string): Promise<User | null>;
  findAllByOrg(organizationId: string, options: any): Promise<{ data: User[]; total: number }>;
  updateUser(id: string, updateUserDto: UpdateUserDto, organizationId: string): Promise<User>;
  updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User>;
  updateUserStatus(id: string, status: UserStatus, organizationId: string): Promise<User>;
  remove(id: string, organizationId: string): Promise<void>;
  inviteUser(inviteUserDto: InviteUserDto, organizationId: string): Promise<User>;
  save(user: User): Promise<User>;
}

export interface IRolesService {
  findAllByOrg(organizationId: string): Promise<Role[]>;
  findOne(id: string, organizationId: string): Promise<Role>;
  create(createRoleDto: CreateRoleDto, organizationId: string): Promise<Role>;
  update(id: string, updateRoleDto: UpdateRoleDto, organizationId: string): Promise<Role>;
  remove(id: string, organizationId: string): Promise<void>;
}

export interface ITokenService {
  validateTokenAndGetUser(payload: JwtPayload): Promise<AuthenticatedUser>;
  generateAuthResponse(user: User, extraPayload?: any, ipAddress?: string, userAgent?: string, rememberMe?: boolean): Promise<any>;
  getFreshUserStatus(userFromJwt: AuthenticatedUser): Promise<any>;
}

export interface ISessionService {
  refreshAccessToken(token: string, ipAddress?: string, userAgent?: string): Promise<any>;
  getUserSessions(userId: string, currentRefreshTokenId?: string): Promise<any[]>;
  revokeSession(userId: string, sessionId: string): Promise<{ message: string }>;
  terminateAllSessions(userId: string): Promise<void>;
}

export interface ISecurityAnalysisService {
  checkImpossibleTravel(userId: string, currentIp?: string): Promise<void>;
  validateTwoFactorCode(user: User, code: string): Promise<boolean>;
  parseUserAgent(userAgent: string): { browser: string; os: string; deviceType: string };
  handleFailedLoginAttempt(user: User): Promise<void>;
  resetLoginAttempts(user: User): Promise<void>;
}

export interface IMfaOrchestratorService {
  sendLoginOtp(user: User): Promise<void>;
  complete2faLogin(user: User, code: string, ipAddress?: string, userAgent?: string): Promise<any>;
}

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  verifyDummy(password: string): Promise<void>;
}

export interface IUserCacheService {
  clearUserSession(userId: string): Promise<void>;
  getUser(userId: string): Promise<any | null>;
  setUser(userId: string, user: any, ttl?: number): Promise<void>;
}

export interface IGeoService {
  getLocation(ip: string): any;
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
}
