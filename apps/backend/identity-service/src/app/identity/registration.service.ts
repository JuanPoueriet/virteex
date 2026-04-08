import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserStatus } from './user.entity';
import { IUsersService, IPasswordService } from './identity.interfaces';
import { USERS_SERVICE_TOKEN, PASSWORD_SERVICE_TOKEN } from './identity.constants';

@Injectable()
export class RegistrationService {
  constructor(
    @Inject(USERS_SERVICE_TOKEN)
    private readonly usersService: IUsersService,
    @Inject(PASSWORD_SERVICE_TOKEN)
    private readonly passwordService: IPasswordService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject('MailNotifier')
    private readonly mailService: any
  ) {}

  async register(registerDto: any) {
      const { email, password, firstName, lastName } = registerDto;
      const hashedPassword = await this.passwordService.hash(password);

      const user = this.userRepository.create({
          email,
          firstName,
          lastName,
          organizationId: 'new-org', // Simplified
          status: UserStatus.ACTIVE,
          security: {
              passwordHash: hashedPassword,
              tokenVersion: 1
          } as any
      });

      return this.userRepository.save(user);
  }
}
