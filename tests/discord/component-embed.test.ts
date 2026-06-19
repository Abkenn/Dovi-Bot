import { ComponentType, EmbedBuilder, MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  buildComponentEmbedMessage,
  buildComponentEmbedMessageFromEmbeds,
} from '../../src/modules/discord/component-embed';

type TextDisplayComponent = {
  type: ComponentType.TextDisplay;
  content: string;
};

type ContainerComponent = {
  type: ComponentType.Container;
  accentColor?: number;
  components: { type: ComponentType; content?: string }[];
};

const getContainer = (
  message: ReturnType<typeof buildComponentEmbedMessage>,
): ContainerComponent => {
  const container = message.components?.[0] as unknown;

  if (
    typeof container !== 'object' ||
    container === null ||
    !('type' in container) ||
    container.type !== ComponentType.Container
  ) {
    throw new Error('Expected container component');
  }

  return container as ContainerComponent;
};

const getTextContent = (container: ContainerComponent): string[] =>
  container.components
    .filter(
      (component): component is TextDisplayComponent =>
        component.type === ComponentType.TextDisplay,
    )
    .map((component) => component.content);

describe('component embed', () => {
  it('builds a component message with description, accent, and grouped fields', () => {
    const message = buildComponentEmbedMessage({
      title: 'Stream Info',
      description: 'Fresh stream state',
      accentColor: 0xff3131,
      fields: [
        { name: 'One', value: '1', inline: true },
        { name: 'Two', value: '2', inline: true },
        { name: 'Three', value: '3', inline: true },
        { name: 'Four', value: '4' },
      ],
    });
    const container = getContainer(message);

    expect(message.flags).toBe(MessageFlags.IsComponentsV2);
    expect(container.accentColor).toBe(0xff3131);
    expect(getTextContent(container)).toEqual([
      '# Stream Info\nFresh stream state',
      '### One\n1\n### Two\n2\n### Three\n3',
      '### Four\n4',
    ]);
  });

  it('builds a minimal component message without fields', () => {
    const container = getContainer(
      buildComponentEmbedMessage({
        title: 'Stream Info',
      }),
    );

    expect(container.accentColor).toBeUndefined();
    expect(container.components).toHaveLength(1);
    expect(getTextContent(container)).toEqual(['# Stream Info']);
  });

  it('builds component messages from embeds and raw embed data', () => {
    const message = buildComponentEmbedMessageFromEmbeds(
      [
        new EmbedBuilder()
          .setTitle('Stream Info')
          .setDescription('Live')
          .setColor(0x123456),
        {
          fields: [{ name: 'Next stream', value: 'Soon' }],
        },
      ],
      { accentColor: 0xff3131 },
    );

    expect(message.components).toHaveLength(2);
    expect(message.flags).toBe(MessageFlags.IsComponentsV2);
  });
});
