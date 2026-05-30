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
  COMMAND_CATEGORIES,
  COMMAND_CATEGORY_METADATA,
} from '../../config/discord-command-categories';
import {
  type CommandMetadata,
  HELP_AUDIENCES,
  HELP_COMMANDS,
} from '../../config/discord-command-metadata';

const COMMAND_CATEGORY_ORDER = [
  COMMAND_CATEGORIES.GENERAL,
  COMMAND_CATEGORIES.STREAM_INFO,
  COMMAND_CATEGORIES.BOSSES,
  COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS,
  COMMAND_CATEGORIES.BOSS_TRIALS,
  COMMAND_CATEGORIES.COMMUNITY_STATS,
  COMMAND_CATEGORIES.STAGING,
  COMMAND_CATEGORIES.HELP,
] as const satisfies readonly CommandMetadata['helpCategory'][];

export const HELP_TOPIC_SELECT_CUSTOM_ID = 'help:topic';

export type HelpTopicValue =
  | 'all'
  | 'stream-info'
  | 'bosses'
  | 'boss-trials'
  | 'davi-stream-tracking-tools'
  | 'community-stats'
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
    category: COMMAND_CATEGORIES.GENERAL,
    adminOnly: false,
  },
  {
    name: 'Stream Info',
    value: 'stream-info',
    description: 'Stream schedule and stream metadata commands',
    category: COMMAND_CATEGORIES.STREAM_INFO,
    adminOnly: false,
  },
  {
    name: 'Bosses',
    value: 'bosses',
    description: 'Boss stats commands',
    category: COMMAND_CATEGORIES.BOSSES,
    adminOnly: false,
  },
  {
    name: 'Boss Trials',
    value: 'boss-trials',
    description: 'Boss trial poll and stats commands',
    category: COMMAND_CATEGORIES.BOSS_TRIALS,
    adminOnly: false,
  },
  {
    name: 'Stream Game Tracking Tools',
    value: 'davi-stream-tracking-tools',
    description: 'Live and offline boss tracking commands',
    category: COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS,
    adminOnly: false,
  },
  {
    name: 'Community Stats',
    value: 'community-stats',
    description: 'Community discussion stats commands',
    category: COMMAND_CATEGORIES.COMMUNITY_STATS,
    adminOnly: false,
  },
  {
    name: 'Staging',
    value: 'staging',
    description: 'Staging-only command helpers',
    category: COMMAND_CATEGORIES.STAGING,
    adminOnly: true,
  },
  {
    name: 'Help',
    value: 'help',
    description: 'Help command usage',
    category: COMMAND_CATEGORIES.HELP,
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

const formatCommand = (command: CommandMetadata): string =>
  `\`/${command.name}\` - ${command.description}`;

const buildCommandList = (commands: readonly CommandMetadata[]): string =>
  commands.map(formatCommand).join('\n');

const buildCommandGroupContent = (
  commands: readonly CommandMetadata[],
): string => {
  const publicCommands = commands.filter(
    (command) => command.helpAudience === HELP_AUDIENCES.PUBLIC,
  );
  const adminCommands = commands.filter(
    (command) => command.helpAudience === HELP_AUDIENCES.ADMIN,
  );
  const sections: string[] = [];

  if (publicCommands.length > 0) {
    sections.push(buildCommandList(publicCommands));
  }

  if (adminCommands.length > 0) {
    sections.push(`**Admin commands**\n${buildCommandList(adminCommands)}`);
  }

  return sections.join('\n\n');
};

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
  const topicOption = getTopicByValue(topic);
  const accentColor = topicOption?.category
    ? COMMAND_CATEGORY_METADATA[topicOption.category].accentColor
    : undefined;

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
        `### ${category}\n${buildCommandGroupContent(categoryCommands)}`,
      ),
    );
  }
};

const getTopicByValue = (topic: HelpTopicValue) =>
  HELP_TOPIC_OPTIONS.find((option) => option.value === topic);

const getTopicTitle = (topicName: string): string => {
  if (topicName === COMMAND_CATEGORIES.HELP) {
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
        buildTextDisplay(buildCommandGroupContent(topicCommands)),
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
