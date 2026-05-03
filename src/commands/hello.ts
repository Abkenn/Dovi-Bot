import { HELLO_GREETINGS } from '@data/hello-greetings';
import { Command } from '@sapphire/framework';
import { COMMAND_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';

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
        guildIds: [...COMMAND_GUILDS.HELLO],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.HELLO),
      run: async ({ editReply }) => {
        const greeting =
          HELLO_GREETINGS[Math.floor(Math.random() * HELLO_GREETINGS.length)] ??
          'Hello!';

        return editReply({
          content: greeting,
        });
      },
    });
  }
}
