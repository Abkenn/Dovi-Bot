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

const COMMAND_CATEGORY_ORDER = [
  HELP_CATEGORIES.GENERAL,
  HELP_CATEGORIES.STREAM_INFO,
  HELP_CATEGORIES.BOSSES,
  HELP_CATEGORIES.OPERATOR,
] as const satisfies readonly CommandMetadata['helpCategory'][];

export const HELP_TOPIC_SELECT_CUSTOM_ID = 'help:topic';

export type HelpTopicValue =
  | 'all'
  | 'general'
  | 'stream-info'
  | 'bosses'
  | 'operator';

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
    name: 'Operator',
    value: 'operator',
    description: 'Staging and operator commands',
    category: HELP_CATEGORIES.OPERATOR,
    adminOnly: true,
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

const buildTextDisplay = (content: string): TextDisplayComponentData => ({
  type: ComponentType.TextDisplay,
  content,
});

const buildSeparator = (): ComponentInContainerData => ({
  type: ComponentType.Separator,
  divider: true,
  spacing: SeparatorSpacingSize.Small,
});

const buildTopicSelect = ({
  canManageGuild,
  selectedTopic,
}: {
  canManageGuild: boolean;
  selectedTopic: HelpTopicValue;
}): ComponentInContainerData => {
  const options: SelectMenuComponentOptionData[] = getHelpTopicAutocomplete({
    canManageGuild,
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
  query,
}: {
  canManageGuild: boolean;
  query: string;
}) => {
  const normalizedQuery = query.trim().toLowerCase();
  const availableTopics = HELP_TOPIC_OPTIONS.filter(
    (topic) => canManageGuild || !topic.adminOnly,
  );

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

export const buildHelpMessage = ({
  canManageGuild,
  guildId,
  topic,
}: {
  canManageGuild: boolean;
  guildId: BotGuildId;
  topic?: HelpTopicValue | null;
}): MessageEditOptions => {
  const guildCommands = HELP_COMMANDS.filter((command) =>
    command.guildIds.includes(guildId),
  );
  const visibleCommands = getVisibleCommands({
    canManageGuild,
    commands: guildCommands,
  });
  const selectedTopic = topic ?? 'stream-info';
  const topicOption = getTopicByValue(selectedTopic);

  if (topicOption?.category) {
    const topicCommands = getCommandsForCategory(
      visibleCommands,
      topicOption.category,
    );
    const components: ComponentInContainerData[] = [
      buildTextDisplay(
        `# ${topicOption.name} Help\nUse the topic picker below to switch this help card without sending a new message.`,
      ),
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
      buildTopicSelect({ canManageGuild, selectedTopic }),
    );

    return {
      components: [
        {
          type: ComponentType.Container,
          components,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  const publicCommands = guildCommands.filter(
    (command) => command.helpAudience === HELP_AUDIENCES.PUBLIC,
  );
  const adminCommands = guildCommands.filter(
    (command) => command.helpAudience === HELP_AUDIENCES.ADMIN,
  );
  const components: ComponentInContainerData[] = [
    buildTextDisplay(
      '# Help\nUse the topic picker below to switch this help card without sending a new message.',
    ),
    buildSeparator(),
  ];

  addCommandBlocks(components, publicCommands);

  if (canManageGuild) {
    components.push(
      buildSeparator(),
      buildTextDisplay(
        `## Admin Commands\n${adminCommands.map(formatCommand).join('\n')}`,
      ),
    );
  }

  components.push(
    buildSeparator(),
    buildTopicSelect({ canManageGuild, selectedTopic: 'all' }),
  );

  const topLevelComponents: TopLevelComponentData[] = [
    {
      type: ComponentType.Container,
      components,
    },
  ];

  return {
    components: topLevelComponents,
    flags: MessageFlags.IsComponentsV2,
  };
};
