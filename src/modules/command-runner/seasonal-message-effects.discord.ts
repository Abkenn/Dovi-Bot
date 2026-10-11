import {
  type APIComponentInContainer,
  type APIMessageTopLevelComponent,
  ComponentType,
  type MessageEditOptions,
  parseEmoji,
} from 'discord.js';
import type { SeasonalButtonSnapshot } from '../../data/queries/seasonal-message-effects.types';

type EffectComponent = APIMessageTopLevelComponent | APIComponentInContainer;

export const preserveSeasonalButtonEmoji = (
  options: MessageEditOptions,
  previous: readonly APIMessageTopLevelComponent[],
  emoji: string,
): MessageEditOptions => {
  const decoration = parseEmoji(emoji);
  const buttons = getSeasonalActivityButtons(previous).filter((button) =>
    decoration?.id
      ? button.emoji?.id === decoration.id
      : button.emoji?.name === decoration?.name,
  );
  if (!decoration || !buttons.length || !options.components) return options;
  return {
    ...options,
    components: options.components.map((component) => {
      const data = 'toJSON' in component ? component.toJSON() : component;
      if (data.type !== ComponentType.ActionRow || !('components' in data))
        return component;
      return {
        ...data,
        components: data.components.map((button) =>
          'custom_id' in button &&
          buttons.some((previous) => previous.customId === button.custom_id)
            ? { ...button, emoji: decoration }
            : button,
        ),
      };
    }),
  };
};

export const stripSeasonalEye = (content: string, emoji: string) => {
  if (content.startsWith(`# ${emoji} `))
    return `# ${content.slice(emoji.length + 3)}`;
  return content.startsWith(`${emoji} `)
    ? content.slice(emoji.length + 1)
    : content;
};

export const getSeasonalActivityButtons = (
  components: readonly EffectComponent[],
): SeasonalButtonSnapshot[] =>
  components.flatMap((component) => {
    if (component.type === ComponentType.Container)
      return getSeasonalActivityButtons(component.components);
    if (component.type !== ComponentType.ActionRow) return [];
    return component.components.flatMap((button) => {
      if (button.type !== ComponentType.Button || !('custom_id' in button))
        return [];
      if (
        button.custom_id !== 'embedded-app-stats' &&
        !button.custom_id.startsWith('embedded-app-stats:')
      )
        return [];
      return [{ customId: button.custom_id, emoji: button.emoji ?? null }];
    });
  });

export const updateSeasonalEffectComponents = (
  components: readonly APIMessageTopLevelComponent[],
  buttons: readonly SeasonalButtonSnapshot[],
  emoji: string,
  showButtonEye: boolean,
  removeTextEye: boolean,
): APIMessageTopLevelComponent[] => {
  const decoration = parseEmoji(emoji);
  const transform = <T extends EffectComponent>(component: T): T => {
    if (component.type === ComponentType.Container)
      return { ...component, components: component.components.map(transform) };
    if (component.type === ComponentType.TextDisplay && removeTextEye)
      return {
        ...component,
        content: stripSeasonalEye(component.content, emoji),
      };
    if (component.type !== ComponentType.ActionRow) return component;
    return {
      ...component,
      components: component.components.map((button) => {
        if (button.type !== ComponentType.Button || !('custom_id' in button))
          return button;
        const original = buttons.find(
          (entry) => entry.customId === button.custom_id,
        );
        if (!original || !decoration) return button;
        if (showButtonEye)
          return {
            ...button,
            emoji: decoration,
          };
        const matches = decoration.id
          ? button.emoji?.id === decoration.id
          : !button.emoji?.id && button.emoji?.name === decoration.name;
        if (!matches) return button;
        const { emoji: _emoji, ...restored } = button;
        return original.emoji
          ? { ...restored, emoji: original.emoji }
          : restored;
      }),
    };
  };
  return components.map(transform);
};
