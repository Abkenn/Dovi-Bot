import {
  type APIComponentInContainer,
  type APIMessageTopLevelComponent,
  ComponentType,
  type MessageEditOptions,
  parseEmoji,
} from 'discord.js';
import type { SeasonalButtonSnapshot } from '../../data/queries/seasonal-message-effects.types';
import type { SeasonalTitlePulse } from './seasonal-command-theme.types';

type EffectComponent = APIMessageTopLevelComponent | APIComponentInContainer;

export const getSeasonalTitlePulse = (
  messageId: string,
  elapsedMs: number,
  pulse: SeasonalTitlePulse,
) => {
  let start = 0;
  let phase = 0;
  while (true) {
    let seed = 2166136261;
    for (const character of `${messageId}:title:${phase}`)
      seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
    const next =
      start +
      pulse.minIntervalMs +
      (seed % (pulse.maxIntervalMs - pulse.minIntervalMs + 1));
    if (elapsedMs < next) {
      const visible = elapsedMs < start + pulse.visibleMs;
      return {
        visible,
        nextChangeMs: visible ? start + pulse.visibleMs : next,
      };
    }
    start = next;
    phase++;
  }
};

const buttonKey = (button: { custom_id: string; label?: string }) => {
  if (button.custom_id.startsWith('music-page:'))
    return `${button.custom_id.split(':').slice(0, 2).join(':')}:${button.label}`;
  if (button.custom_id.startsWith('embedded-app-stats:music-search:'))
    return 'embedded-app-stats:music-search';
  return button.custom_id;
};

export const getSeasonalButtonCycle = (
  messageId: string,
  buttons: readonly SeasonalButtonSnapshot[],
  phase: number,
): string[] => {
  if (!buttons.length) return [];
  let seed = 2166136261;
  for (const character of `${messageId}:${phase}`)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  if (phase % 4 === 3 && seed % 3 === 0) return [];
  const first = seed % buttons.length;
  const chosen = [buttons[first]?.customId ?? ''];
  if (buttons.length > 1 && seed % 4 === 0)
    chosen.push(buttons[(first + 1) % buttons.length]?.customId ?? '');
  return chosen;
};

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
          buttons.some((previous) => previous.customId === buttonKey(button))
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
        !button.custom_id.startsWith('embedded-app-stats:') &&
        !button.custom_id.startsWith('music-page:')
      )
        return [];
      return [{ customId: buttonKey(button), emoji: button.emoji ?? null }];
    });
  });

export const updateSeasonalEffectComponents = (
  components: readonly APIMessageTopLevelComponent[],
  buttons: readonly SeasonalButtonSnapshot[],
  emoji: string,
  showButtonEye: boolean | readonly string[],
  removeTextEye: boolean,
  titleEye?: boolean,
): APIMessageTopLevelComponent[] => {
  const decoration = parseEmoji(emoji);
  let titleHandled = false;
  const transform = <T extends EffectComponent>(component: T): T => {
    if (component.type === ComponentType.Container)
      return { ...component, components: component.components.map(transform) };
    if (component.type === ComponentType.TextDisplay) {
      let content =
        removeTextEye || titleEye === false
          ? stripSeasonalEye(component.content, emoji)
          : component.content;
      if (titleEye && !titleHandled && content.startsWith('# ')) {
        titleHandled = true;
        if (!content.startsWith(`# ${emoji} `))
          content = `# ${emoji} ${content.slice(2)}`;
      }
      return { ...component, content };
    }
    if (component.type !== ComponentType.ActionRow) return component;
    return {
      ...component,
      components: component.components.map((button) => {
        if (button.type !== ComponentType.Button || !('custom_id' in button))
          return button;
        const original = buttons.find(
          (entry) =>
            entry.customId === buttonKey(button) ||
            entry.customId === button.custom_id,
        );
        if (!original || !decoration) return button;
        const selected =
          typeof showButtonEye === 'boolean'
            ? showButtonEye
            : showButtonEye.includes(original.customId);
        if (selected)
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
