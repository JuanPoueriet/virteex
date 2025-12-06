import { SetMetadata } from '@nestjs/common';

export const PLAN_LIMIT_KEY = 'plan_limit';
export const CheckPlanLimit = (resource: string, increment: number = 1) =>
  SetMetadata(PLAN_LIMIT_KEY, { resource, increment });
