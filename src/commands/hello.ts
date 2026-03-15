import { HELLO_GREETINGS } from '@data/hello-greetings';
import { Command } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';

export class HelloCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'hello',
      description: 'Replies with a greeting.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [env.DISCORD_GUILD_ID],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const greeting =
      HELLO_GREETINGS[Math.floor(Math.random() * HELLO_GREETINGS.length)] ??
      'Hello!';

    return interaction.reply({
      content: greeting,
    });
  }
}
