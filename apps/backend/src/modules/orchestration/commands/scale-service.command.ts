export class ScaleServiceCommand {
  constructor(
    public readonly serviceName: string,
    public readonly replicas: number,
  ) {}
}
