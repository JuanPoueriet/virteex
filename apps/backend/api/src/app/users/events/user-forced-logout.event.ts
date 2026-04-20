export class UserForcedLogoutEvent {
  constructor(
    public readonly userId: string,
    public readonly reason: string
  ) {}
}
