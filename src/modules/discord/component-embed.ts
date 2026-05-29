import {
  type APIEmbed,
  type ComponentInContainerData,
  ComponentType,
  type EmbedBuilder,
  type JSONEncodable,
  type MessageEditOptions,
  MessageFlags,
  SeparatorSpacingSize,
  type TextDisplayComponentData,
  type TopLevelComponentData,
} from 'discord.js';

export type ComponentEmbedField = {
  name: string;
  value: string;
  inline?: boolean | undefined;
};

export type ComponentEmbedInput = {
  title: string;
  description?: string | undefined;
  accentColor?: number | undefined;
  fields?: readonly ComponentEmbedField[] | undefined;
};

export type ComponentEmbedSource =
  | EmbedBuilder
  | APIEmbed
  | JSONEncodable<APIEmbed>;

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
    return `**${title}**`;
  }

  return `**${title}**\n${description}`;
};

const buildFieldContent = (field: ComponentEmbedField): string =>
  `**${field.name}**\n${field.value}`;

const buildInlineFieldContent = (
  fields: readonly ComponentEmbedField[],
): string =>
  fields
    .map((field) => `**${field.name}:** ${field.value.replaceAll('\n', ' ')}`)
    .join('\n');

const buildFieldComponents = (
  fields: readonly ComponentEmbedField[],
): ComponentInContainerData[] => {
  const components: ComponentInContainerData[] = [];
  let inlineFields: ComponentEmbedField[] = [];

  const flushInlineFields = () => {
    if (inlineFields.length === 0) {
      return;
    }

    components.push(buildTextDisplay(buildInlineFieldContent(inlineFields)));
    inlineFields = [];
  };

  for (const field of fields) {
    if (field.inline) {
      inlineFields.push(field);

      if (inlineFields.length === 3) {
        flushInlineFields();
      }

      continue;
    }

    flushInlineFields();
    components.push(buildTextDisplay(buildFieldContent(field)));
  }

  flushInlineFields();

  return components;
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

  components.push(...buildFieldComponents(fields));

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
  options: { accentColor?: number } = {},
): MessageEditOptions => {
  const components = embeds.map((embed) => {
    const data = getComponentEmbedSourceData(embed);

    return buildComponentEmbedMessage({
      title: data.title ?? 'Info',
      description: data.description,
      accentColor: options.accentColor ?? data.color,
      fields: data.fields?.map((field) => ({
        name: field.name,
        value: field.value,
        inline: field.inline,
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
