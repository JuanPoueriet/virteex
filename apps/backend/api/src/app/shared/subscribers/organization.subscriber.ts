import {
  EventSubscriber,
  EntitySubscriberInterface,
} from 'typeorm';


@EventSubscriber()
export class OrganizationSubscriber implements EntitySubscriberInterface {
}
