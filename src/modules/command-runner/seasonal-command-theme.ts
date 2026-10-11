import { ComponentType, type MessageEditOptions } from 'discord.js';
import { getSeasonalTheme } from '../../config/seasonal-themes';
import type {
  SeasonalReplySelectionInput,
  SeasonalTheme,
} from './seasonal-command-theme.types';

type ReplyComponent = NonNullable<MessageEditOptions['components']>[number];
type ReplySequence = { userId: string; count: number };

export const createSeasonalReplySelector = () => {
  const sequences = new Map<string, ReplySequence>();
  return ({ scope, userId, kind, theme }: SeasonalReplySelectionInput) => {
    const cadence = theme[kind];
    const key = `${theme.id}:${scope}:${kind}`;
    const previous = sequences.get(key);
    if (previous?.userId === userId && cadence.repeats !== 'allow') {
      if (cadence.repeats === 'normal-and-reset')
        previous.count = cadence.every - 1;
      return false;
    }
    const count =
      (previous?.count ?? (cadence.first ? cadence.every - 1 : 0)) + 1;
    const themed = count >= cadence.every;
    if (sequences.size >= 1000 && !sequences.has(key)) {
      const oldest = sequences.keys().next().value;
      if (oldest) sequences.delete(oldest);
    }
    sequences.set(key, { userId, count: themed ? 0 : count });
    return themed;
  };
};

const componentData = (component: ReplyComponent) =>
  'toJSON' in component ? component.toJSON() : component;

export const hasSeasonalReplyContainer = (options: MessageEditOptions) =>
  options.components?.some(
    (component) => componentData(component).type === ComponentType.Container,
  ) ?? false;

const prefixEye = (content: string, emoji: string) =>
  content.startsWith('# ')
    ? `# ${emoji} ${content.slice(2)}`
    : `${emoji} ${content}`;

export const applySeasonalReplyTheme = (
  options: MessageEditOptions,
  theme: SeasonalTheme,
  withEye = true,
): MessageEditOptions => {
  let hasEye = false;
  const components = options.components?.map((component) => {
    const data = componentData(component);
    if (data.type !== ComponentType.Container || !('components' in data))
      return component;
    return {
      ...data,
      accentColor: theme.accentColor,
      accent_color: theme.accentColor,
      components: data.components.map((child) => {
        const childData = 'toJSON' in child ? child.toJSON() : child;
        if (
          childData.type !== ComponentType.TextDisplay ||
          !('content' in childData) ||
          hasEye ||
          !withEye
        )
          return child;
        hasEye = true;
        return {
          ...childData,
          content: prefixEye(childData.content, theme.emoji),
        };
      }),
    };
  });
  if (components && (hasEye || !withEye)) return { ...options, components };
  if (
    withEye &&
    options.content &&
    options.content.length + theme.emoji.length + 1 <= 2000
  )
    return { ...options, content: prefixEye(options.content, theme.emoji) };
  return options;
};

export const preserveSeasonalReplyTheme = (
  options: MessageEditOptions,
  previous: readonly ReplyComponent[],
  theme = getSeasonalTheme(),
  eyeAllowed = true,
  buttonEyeAllowed = false,
): MessageEditOptions => {
  if (!theme) return options;
  if (buttonEyeAllowed && options.components) {
    const previousButtonIds = previous.flatMap((component) => {
      const data = componentData(component);
      const ids: string[] = [];
      if (data.type !== ComponentType.ActionRow || !('components' in data))
        return ids;
      for (const button of data.components) {
        if (
          'custom_id' in button &&
          typeof button.custom_id === 'string' &&
          'emoji' in button &&
          typeof button.emoji === 'object' &&
          button.emoji !== null &&
          'id' in button.emoji &&
          button.emoji.id === theme.emoji.split(':')[2]?.slice(0, -1)
        )
          ids.push(button.custom_id);
      }
      return ids;
    });
    options = {
      ...options,
      components: options.components.map((component) => {
        const data = componentData(component);
        if (data.type !== ComponentType.ActionRow || !('components' in data))
          return component;
        return {
          ...data,
          components: data.components.map((button) => {
            if (!('custom_id' in button)) return button;
            return previousButtonIds.includes(button.custom_id)
              ? {
                  ...button,
                  emoji: {
                    id: theme.emoji.split(':')[2]?.slice(0, -1),
                    name: 'eye',
                    animated: theme.emoji.startsWith('<a:'),
                  },
                }
              : button;
          }),
        };
      }),
    };
  }
  const hasEye = previous.some((component) => {
    const data = componentData(component);
    if (data.type !== ComponentType.Container || !('components' in data))
      return false;
    return data.components.some((child) => {
      const childData = 'toJSON' in child ? child.toJSON() : child;
      if (
        childData.type !== ComponentType.TextDisplay ||
        !('content' in childData)
      )
        return false;
      return childData.content.startsWith(`# ${theme.emoji} `);
    });
  });
  const hasSeasonalAccent = previous.some((component) => {
    const data = componentData(component);
    if (data.type !== ComponentType.Container) return false;
    if ('accent_color' in data && data.accent_color === theme.accentColor)
      return true;
    return 'accentColor' in data && data.accentColor === theme.accentColor;
  });
  return hasEye || hasSeasonalAccent
    ? applySeasonalReplyTheme(options, theme, hasEye && eyeAllowed)
    : options;
};
