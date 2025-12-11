
import { Injectable, Logger } from '@nestjs/common';
import { IPolicy } from '../decorators/check-permissions.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class IsOrganizationOwnerPolicy implements IPolicy {
    private readonly logger = new Logger(IsOrganizationOwnerPolicy.name);

    async can(user: AuthenticatedUser, request: any): Promise<boolean> {
        // Example ABAC Logic:
        // User must be the owner of the resource OR have the 'ADMIN' role
        // Resource ID is typically in params (e.g. /organizations/:id)

        // Assuming request is Express Request with params
        const resourceId = request.params?.id;

        this.logger.debug(`Checking IsOrganizationOwnerPolicy for user ${user.id} on resource ${resourceId}`);

        if (user.roles?.some((r) => r.name === 'ADMIN')) {
            return true;
        }

        if (resourceId && user.organization?.id === resourceId) {
            return true;
        }

        return false;
    }
}
