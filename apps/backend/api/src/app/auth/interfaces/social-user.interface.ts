export interface SocialUser {
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  accessToken?: string;
  provider: string; // 'google', 'microsoft', 'okta'
  providerId: string;
}
