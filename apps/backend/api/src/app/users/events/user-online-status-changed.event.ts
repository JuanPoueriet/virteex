export class UserOnlineStatusChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly isOnline: boolean
  ) {}
}
