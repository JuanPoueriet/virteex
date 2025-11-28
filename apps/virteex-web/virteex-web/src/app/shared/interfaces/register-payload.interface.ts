export interface RegisterPayload {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName: string;
    fiscalRegionId: string;
    rnc?: string;
    recaptchaToken?: string;
    plan?: string;
    
}