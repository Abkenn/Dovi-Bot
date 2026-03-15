import { Listener } from '@sapphire/framework';

export class ReadyListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: 'ready',
      once: true,
    });
  }

  public override run() {
    this.container.logger.info(
      `Logged in as ${this.container.client.user?.tag ?? 'unknown-user'}`,
    );
  }
}
