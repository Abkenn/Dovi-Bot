import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  MessageFlagsBitField,
} from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  expireComponentLifetime,
  registerComponentLifetime,
  trackComponentMessage,
  trackInteractionComponentReply,
} from '../../src/modules/discord/component-lifecycle';

it('ignores missing reply messages after an Activity launch but reports unexpected tracking failures', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const fetchReply = vi.fn().mockRejectedValue({ code: 10008 });
  await trackInteractionComponentReply({ replied: true, fetchReply } as never);
  expect(log).not.toHaveBeenCalled();
  const error = new Error('Discord unavailable');
  fetchReply.mockRejectedValue(error);
  await trackInteractionComponentReply({ replied: true, fetchReply } as never);
  expect(log).toHaveBeenCalledWith('Could not track Discord controls.', error);
  log.mockRestore();
});

const components = (customId: string) => [
  {
    type: ComponentType.Container,
    components: [
      { type: ComponentType.TextDisplay, content: 'Keep this result' },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            custom_id: customId,
            label: 'Next',
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            url: 'https://example.com',
            label: 'Open',
          },
        ],
      },
    ],
  },
];

const message = (id: string, ephemeral = false) => ({
  id,
  flags: new MessageFlagsBitField(ephemeral ? MessageFlags.Ephemeral : 0),
  components: components(`temporary:${id}:1`).map((component) => ({
    toJSON: () => component,
  })),
  edit: vi.fn().mockResolvedValue(undefined),
  fetch: vi.fn(async function (this: unknown) {
    return this;
  }),
});

describe('component lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('removes temporary public controls automatically, preserving text and links', async () => {
    vi.useFakeTimers();
    registerComponentLifetime('temporary:public', Date.now() + 60_000);
    const result = message('public');
    trackComponentMessage(result as never);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(result.edit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(result.edit).toHaveBeenCalledWith({
      components: [
        {
          type: ComponentType.Container,
          components: [
            { type: ComponentType.TextDisplay, content: 'Keep this result' },
            {
              type: ComponentType.ActionRow,
              components: [
                components('temporary:public:1')[0]?.components[1]
                  ?.components?.[1],
              ],
            },
          ],
        },
      ],
    });
  });

  it('cleans private controls before the webhook expires and refreshes the cleanup editor after navigation', async () => {
    vi.useFakeTimers();
    registerComponentLifetime('temporary:private', Date.now() + 60 * 60_000);
    const result = message('private', true);
    const firstEdit = vi.fn();
    const latestEdit = vi.fn();
    trackComponentMessage(result as never, firstEdit);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    trackComponentMessage(result as never, latestEdit);
    await vi.advanceTimersByTimeAsync(13 * 60_000);
    expect(firstEdit).not.toHaveBeenCalled();
    expect(latestEdit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(latestEdit).toHaveBeenCalledOnce();
    expect(firstEdit).not.toHaveBeenCalled();
  });

  it('keeps permanent public controls and clears evicted sessions immediately', async () => {
    vi.useFakeTimers();
    const permanent = message('permanent');
    trackComponentMessage(permanent as never);
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(permanent.edit).not.toHaveBeenCalled();
    registerComponentLifetime('temporary:evicted', Date.now() + 60_000);
    const evicted = message('evicted');
    trackComponentMessage(evicted as never);
    await expireComponentLifetime('temporary:evicted');
    expect(evicted.edit).toHaveBeenCalledOnce();
  });

  it('cancels cleanup when a newer reply removes the controls', async () => {
    vi.useFakeTimers();
    registerComponentLifetime('temporary:decided', Date.now() + 60 * 60_000);
    const result = message('decided', true);
    trackComponentMessage(result as never);
    trackComponentMessage({ ...result, components: [] } as never);
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    expect(result.edit).not.toHaveBeenCalled();
  });

  it('keeps private controls that remain valid indefinitely', async () => {
    vi.useFakeTimers();
    const result = message('permanent-private', true);
    trackComponentMessage(result as never);
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(result.edit).not.toHaveBeenCalled();
  });

  it('retries temporary Discord failures without changing the expiry deadline', async () => {
    vi.useFakeTimers();
    registerComponentLifetime('temporary:retry', Date.now() + 60_000);
    const result = message('retry');
    result.edit.mockRejectedValueOnce(new Error('Discord unavailable'));
    trackComponentMessage(result as never);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(result.edit).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(result.edit).toHaveBeenCalledTimes(2);
  });

  it('preserves section text when removing its button accessory', async () => {
    vi.useFakeTimers();
    registerComponentLifetime('temporary:section', Date.now() + 60_000);
    const result = message('section');
    result.components = [
      {
        toJSON: () => ({
          type: ComponentType.Section,
          components: [
            { type: ComponentType.TextDisplay, content: 'Result text' },
          ],
          accessory: {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            custom_id: 'temporary:section',
            label: 'Next',
          },
        }),
      },
    ] as never;
    trackComponentMessage(result as never);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(result.edit).toHaveBeenCalledWith({
      components: [{ type: ComponentType.TextDisplay, content: 'Result text' }],
    });
  });

  it('cleans each public control at its own deadline', async () => {
    vi.useFakeTimers();
    registerComponentLifetime('early:control', Date.now() + 60_000);
    registerComponentLifetime('later:control', Date.now() + 120_000);
    const result = message('mixed');
    const row = {
      type: ComponentType.ActionRow,
      components: ['early:control', 'later:control'].map((custom_id) => ({
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        custom_id,
        label: custom_id,
      })),
    };
    result.components = [{ toJSON: () => row }] as never;
    result.edit.mockImplementation(async (options) => {
      result.components = options.components.map((component: object) => ({
        toJSON: () => component,
      }));
    });
    trackComponentMessage(result as never);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(result.edit).toHaveBeenCalledOnce();
    expect(
      result.edit.mock.calls[0]?.[0].components[0].components,
    ).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(result.edit).toHaveBeenLastCalledWith({ components: [] });
  });
});
