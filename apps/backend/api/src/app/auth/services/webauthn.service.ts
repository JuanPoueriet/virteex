
import { Injectable, Inject, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { User } from '../../users/entities/user.entity/user.entity';
import { Passkey } from '../../users/entities/passkey.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class WebAuthnService {
  private rpName = 'Virteex';
  private rpID: string;
  private origin: string;

  constructor(
    @InjectRepository(Passkey)
    private readonly passkeyRepository: Repository<Passkey>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';
    this.origin = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  }

  async generateRegistrationOptions(user: User) {
    const userPasskeys = await this.passkeyRepository.find({ where: { userId: user.id } });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: user.id,
      userName: user.email,
      // Don't exclude credentials we want to allow multiple devices
      // excludeCredentials: userPasskeys.map((passkey) => ({
      //   id: passkey.credentialID,
      //   transports: passkey.transports as AuthenticatorTransportFuture[],
      // })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Store challenge in cache
    await this.cacheManager.set(`webauthn_challenge_${user.id}`, options.challenge, 60000); // 1 minute TTL

    return options;
  }

  async verifyRegistration(user: User, body: any) {
    const challenge = await this.cacheManager.get<string>(`webauthn_challenge_${user.id}`);
    if (!challenge) {
      throw new BadRequestException('Challenge expired or not found');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      const newPasskey = this.passkeyRepository.create({
        user,
        credentialID: credentialID,
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: body.response.transports || [],
        webAuthnUserID: user.id
      });

      await this.passkeyRepository.save(newPasskey);
      await this.cacheManager.del(`webauthn_challenge_${user.id}`);

      return { verified: true };
    }

    throw new BadRequestException('Verification failed');
  }

  async generateAuthenticationOptions(email?: string) {
    let userPasskeys: Passkey[] = [];
    let user: User | null = null;

    // If email is provided, we can look up the user's passkeys to provide them as allowCredentials
    // This allows for a better UI (browser knows which key to ask for)
    if (email) {
       user = await this.userRepository.findOne({ where: { email } });
       if (user) {
         userPasskeys = await this.passkeyRepository.find({ where: { userId: user.id } });
       }
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: userPasskeys.map((passkey) => ({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports as any[],
      })),
      userVerification: 'preferred',
    });

    // We store the challenge. If we have a user, we can scope it to the user.
    // If we don't (username-less flow), we need to track it by a session ID or similar.
    // For now, let's assume the frontend sends the email first, so we use `email` or `user.id` if available.
    // Or we just return the challenge and expect it back (stateful).
    // Better: Store challenge with a temporary ID that we return to the frontend.

    // Simple approach: Store by email if provided, or rely on a temp ID in response if we were doing stateless.
    // But since we are using cache, let's use the challenge itself as the key or part of it?
    // Actually, `verifyAuthentication` needs to know the challenge.

    // If we rely on email for login, we can store by email.
    // If email is not unique enough (race conditions), we might need a temp token.
    // Let's use a temp ID.

    const challengeId = `auth_challenge_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await this.cacheManager.set(challengeId, { challenge: options.challenge, userId: user?.id }, 60000);

    return { ...options, challengeId };
  }

  async verifyAuthentication(body: any) {
    const { challengeId, credential } = body;
    const storedData = await this.cacheManager.get<{ challenge: string, userId?: string }>(challengeId);

    if (!storedData) {
      throw new BadRequestException('Challenge expired or invalid');
    }

    // We need to find the passkey in DB to get the public key
    const passkey = await this.passkeyRepository.findOne({
        where: { credentialID: credential.id },
        relations: ['user']
    });

    if (!passkey) {
      throw new UnauthorizedException('Passkey not found');
    }

    // Security check: if we started flow with a specific user, ensure the passkey belongs to them
    if (storedData.userId && storedData.userId !== passkey.userId) {
        throw new UnauthorizedException('Invalid user for this passkey');
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: storedData.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialPublicKey: Buffer.from(passkey.publicKey, 'base64'),
          credentialID: passkey.credentialID,
          counter: passkey.counter,
          transports: passkey.transports as any[],
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    if (verification.verified) {
      const { authenticationInfo } = verification;
      const { newCounter } = authenticationInfo;

      passkey.counter = newCounter;
      await this.passkeyRepository.save(passkey);
      await this.cacheManager.del(challengeId);

      return { verified: true, user: passkey.user };
    }

    throw new UnauthorizedException('Verification failed');
  }
}
