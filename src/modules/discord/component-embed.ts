import {
  type APIEmbed,
  type ComponentInContainerData,
  ComponentType,
  type EmbedBuilder,
  type MessageEditOptions,
  MessageFlags,
  SeparatorSpacingSize,
  type TextDisplayComponentData,
  type TopLevelComponentData,
} from 'discord.js';

export type ComponentEmbedField = {
  name: string;
  value: string;
};

export type ComponentEmbedInput = {
  title: string;
  description?: string | undefined;
  accentColor?: number | undefined;
  fields?: readonly ComponentEmbedField[] | undefined;
};

export type ComponentEmbedSource = EmbedBuilder | APIEmbed;

const buildTextDisplay = (content: string): TextDisplayComponentData => ({
  type: ComponentType.TextDisplay,
  content,
});

const buildSeparator = (): ComponentInContainerData => ({
  type: ComponentType.Separator,
  divider: true,
  spacing: SeparatorSpacingSize.Small,
});

const buildTitleContent = ({
  title,
  description,
}: Pick<ComponentEmbedInput, 'title' | 'description'>): string => {
  if (!description) {
    return `# ${title}`;
  }

  return `# ${title}\n${description}`;
};

export const buildComponentEmbedMessage = ({
  title,
  description,
  accentColor,
  fields = [],
}: ComponentEmbedInput): MessageEditOptions => {
  const components: ComponentInContainerData[] = [
    buildTextDisplay(buildTitleContent({ title, description })),
  ];

  if (fields.length > 0) {
    components.push(buildSeparator());
  }

  for (const [index, field] of fields.entries()) {
    components.push(buildTextDisplay(`### ${field.name}\n${field.value}`));

    if (index < fields.length - 1) {
      components.push(buildSeparator());
    }
  }

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    components,
  };

  if (accentColor !== undefined) {
    container.accentColor = accentColor;
  }

  const topLevelComponents: TopLevelComponentData[] = [container];

  return {
    components: topLevelComponents,
    flags: MessageFlags.IsComponentsV2,
  };
};

const getComponentEmbedSourceData = (embed: ComponentEmbedSource): APIEmbed => {
  if ('toJSON' in embed && typeof embed.toJSON === 'function') {
    return embed.toJSON() as APIEmbed;
  }

  return embed as APIEmbed;
};

export const buildComponentEmbedMessageFromEmbeds = (
  embeds: readonly ComponentEmbedSource[],
): MessageEditOptions => {
  const components = embeds.map((embed) => {
    const data = getComponentEmbedSourceData(embed);

    return buildComponentEmbedMessage({
      title: data.title ?? 'Info',
      description: data.description,
      accentColor: data.color,
      fields: data.fields?.map((field) => ({
        name: field.name,
        value: field.value,
      })),
    }).components?.[0];
  });

  return {
    components: components.filter(
      (component): component is TopLevelComponentData => Boolean(component),
    ),
    flags: MessageFlags.IsComponentsV2,
  };
};
