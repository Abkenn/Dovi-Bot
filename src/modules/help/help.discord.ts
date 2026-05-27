import {
  type ComponentInContainerData,
  ComponentType,
  type MessageEditOptions,
  MessageFlags,
  type SelectMenuComponentOptionData,
  SeparatorSpacingSize,
  type StringSelectMenuComponentData,
  type TextDisplayComponentData,
  type TopLevelComponentData,
} from 'discord.js';
import type { BotGuildId } from '../../config/discord-access';
import {
  type CommandMetadata,
  HELP_AUDIENCES,
  HELP_CATEGORIES,
  HELP_COMMANDS,
} from '../../config/discord-command-metadata';
import { DISCORD_STYLE } from '../../config/discord-style';

const COMMAND_CATEGORY_ORDER = [
  HELP_CATEGORIES.GENERAL,
  HELP_CATEGORIES.STREAM_INFO,
  HELP_CATEGORIES.BOSSES,
  HELP_CATEGORIES.STAGING,
  HELP_CATEGORIES.HELP,
] as const satisfies readonly CommandMetadata['helpCategory'][];

export const HELP_TOPIC_SELECT_CUSTOM_ID = 'help:topic';

export type HelpTopicValue =
  | 'all'
  | 'stream-info'
  | 'bosses'
  | 'staging'
  | 'general'
  | 'help';

const HELP_TOPIC_OPTIONS = [
  {
    name: 'All',
    value: 'all',
    description: 'Show all available help topics',
    category: null,
    adminOnly: false,
  },
  {
    name: 'General',
    value: 'general',
    description: 'Basic commands',
    category: HELP_CATEGORIES.GENERAL,
    adminOnly: false,
  },
  {
    name: 'Stream Info',
    value: 'stream-info',
    description: 'Stream schedule and stream metadata commands',
    category: HELP_CATEGORIES.STREAM_INFO,
    adminOnly: false,
  },
  {
    name: 'Bosses',
    value: 'bosses',
    description: 'Boss stats and boss trial commands',
    category: HELP_CATEGORIES.BOSSES,
    adminOnly: false,
  },
  {
    name: 'Staging',
    value: 'staging',
    description: 'Staging-only command helpers',
    category: HELP_CATEGORIES.STAGING,
    adminOnly: true,
  },
  {
    name: 'Help',
    value: 'help',
    description: 'Help command usage',
    category: HELP_CATEGORIES.HELP,
    adminOnly: false,
  },
] as const satisfies readonly {
  name: string;
  value: HelpTopicValue;
  description: string;
  category: CommandMetadata['helpCategory'] | null;
  adminOnly: boolean;
}[];

const HELP_TOPIC_VALUES = new Set<string>(
  HELP_TOPIC_OPTIONS.map((topic) => topic.value),
);

const HELP_TOPIC_ACCENT_COLORS: Partial<Record<HelpTopicValue, number>> = {
  'stream-info': DISCORD_STYLE.BOT_ACCENT_COLOR,
  bosses: 0xf59e0b,
  staging: 0x5865f2,
  general: 0x57f287,
  help: 0xfee75c,
} as const;

const formatCommand = (command: CommandMetadata): string =>
  `\`/${command.name}\` - ${command.description}`;

const getGuildCommands = (guildId: string) =>
  HELP_COMMANDS.filter((command) =>
    command.guildIds.some((allowedGuildId) => allowedGuildId === guildId),
  );

const buildTextDisplay = (content: string): TextDisplayComponentData => ({
  type: ComponentType.TextDisplay,
  content,
});

const buildSeparator = (): ComponentInContainerData => ({
  type: ComponentType.Separator,
  divider: true,
  spacing: SeparatorSpacingSize.Small,
});

const buildContainer = (
  components: readonly ComponentInContainerData[],
  topic: HelpTopicValue,
): TopLevelComponentData => {
  const accentColor = HELP_TOPIC_ACCENT_COLORS[topic];

  if (accentColor === undefined) {
    return {
      type: ComponentType.Container,
      components,
    };
  }

  return {
    type: ComponentType.Container,
    accentColor,
    components,
  };
};

const buildTopicSelect = ({
  canManageGuild,
  commands,
  selectedTopic,
}: {
  canManageGuild: boolean;
  commands: readonly CommandMetadata[];
  selectedTopic: HelpTopicValue;
}): ComponentInContainerData => {
  const options: SelectMenuComponentOptionData[] = getHelpTopicAutocomplete({
    canManageGuild,
    commands,
    query: '',
  }).map((topic) => ({
    label: topic.name,
    value: topic.value,
    description: topic.description,
    default: topic.value === selectedTopic,
  }));
  const select: StringSelectMenuComponentData = {
    type: ComponentType.StringSelect,
    customId: HELP_TOPIC_SELECT_CUSTOM_ID,
    placeholder: 'Choose a help topic',
    minValues: 1,
    maxValues: 1,
    options,
  };

  return {
    type: ComponentType.ActionRow,
    components: [select],
  };
};

const getCommandsForCategory = (
  commands: readonly CommandMetadata[],
  category: CommandMetadata['helpCategory'],
) => commands.filter((command) => command.helpCategory === category);

export const isHelpTopicValue = (value: string): value is HelpTopicValue =>
  HELP_TOPIC_VALUES.has(value);

export const getHelpTopicAutocomplete = ({
  canManageGuild,
  commands,
  query,
}: {
  canManageGuild: boolean;
  commands?: readonly CommandMetadata[];
  query: string;
}) => {
  const normalizedQuery = query.trim().toLowerCase();
  const availableTopics = HELP_TOPIC_OPTIONS.filter((topic) => {
    if (!canManageGuild && topic.adminOnly) {
      return false;
    }

    if (!commands || topic.category === null) {
      return true;
    }

    return commands.some((command) => command.helpCategory === topic.category);
  });

  if (!normalizedQuery) {
    return availableTopics;
  }

  return availableTopics.filter(
    (topic) =>
      topic.name.toLowerCase().includes(normalizedQuery) ||
      topic.value.includes(normalizedQuery),
  );
};

const addCommandBlocks = (
  components: ComponentInContainerData[],
  commands: readonly CommandMetadata[],
) => {
  for (const category of COMMAND_CATEGORY_ORDER) {
    const categoryCommands = getCommandsForCategory(commands, category);

    if (categoryCommands.length === 0) {
      continue;
    }

    components.push(
      buildTextDisplay(
        `### ${category}\n${categoryCommands.map(formatCommand).join('\n')}`,
      ),
    );
  }
};

const getTopicByValue = (topic: HelpTopicValue) =>
  HELP_TOPIC_OPTIONS.find((option) => option.value === topic);

const getTopicTitle = (topicName: string): string => {
  if (topicName === HELP_CATEGORIES.HELP) {
    return 'Help';
  }

  return `${topicName} Help`;
};

const getVisibleCommands = ({
  canManageGuild,
  commands,
}: {
  canManageGuild: boolean;
  commands: readonly CommandMetadata[];
}) =>
  commands.filter(
    (command) =>
      canManageGuild || command.helpAudience === HELP_AUDIENCES.PUBLIC,
  );

export const getVisibleHelpCommands = ({
  canManageGuild,
  guildId,
}: {
  canManageGuild: boolean;
  guildId: string | null;
}) => {
  const guildCommands = guildId ? getGuildCommands(guildId) : HELP_COMMANDS;

  return getVisibleCommands({
    canManageGuild,
    commands: guildCommands,
  });
};

export const buildHelpMessage = ({
  canManageGuild,
  guildId,
  topic,
}: {
  canManageGuild: boolean;
  guildId: BotGuildId;
  topic?: HelpTopicValue | null;
}): MessageEditOptions => {
  const visibleCommands = getVisibleHelpCommands({
    canManageGuild,
    guildId,
  });
  const requestedTopic = topic ?? 'stream-info';
  const availableTopicValues = new Set(
    getHelpTopicAutocomplete({
      canManageGuild,
      commands: visibleCommands,
      query: '',
    }).map((option) => option.value),
  );
  const selectedTopic = availableTopicValues.has(requestedTopic)
    ? requestedTopic
    : 'stream-info';
  const topicOption = getTopicByValue(selectedTopic);

  if (topicOption?.category) {
    const topicCommands = getCommandsForCategory(
      visibleCommands,
      topicOption.category,
    );
    const components: ComponentInContainerData[] = [
      buildTextDisplay(`# ${getTopicTitle(topicOption.name)}`),
      buildSeparator(),
    ];

    if (topicCommands.length > 0) {
      components.push(
        buildTextDisplay(topicCommands.map(formatCommand).join('\n')),
      );
    } else {
      components.push(
        buildTextDisplay('No commands available for this topic.'),
      );
    }

    components.push(
      buildSeparator(),
      buildTextDisplay('Browse other topics.'),
      buildTopicSelect({
        canManageGuild,
        commands: visibleCommands,
        selectedTopic,
      }),
    );

    return {
      components: [buildContainer(components, selectedTopic)],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  const components: ComponentInContainerData[] = [
    buildTextDisplay('# Help'),
    buildSeparator(),
  ];

  addCommandBlocks(components, visibleCommands);

  components.push(
    buildSeparator(),
    buildTextDisplay('Browse other topics.'),
    buildTopicSelect({
      canManageGuild,
      commands: visibleCommands,
      selectedTopic: 'all',
    }),
  );

  const topLevelComponents: TopLevelComponentData[] = [
    buildContainer(components, 'all'),
  ];

  return {
    components: topLevelComponents,
    flags: MessageFlags.IsComponentsV2,
  };
};
