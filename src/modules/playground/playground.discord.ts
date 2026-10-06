import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
} from 'discord.js';
import type { TrackedActivityInstance } from '../embedded-app/activity-tracking.types';
import type { PlaygroundSubmission } from './playground.types';

export const buildPlaygroundModal = (userId: string, expiresAt: number) =>
  new ModalBuilder()
    .setCustomId(`playground:modal:${userId}:${expiresAt}`)
    .setTitle('Discord component playground')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Stream type — choose one')
        .setRadioGroupComponent((radio) =>
          radio
            .setCustomId('stream-type')
            .addOptions(
              { label: 'Game', value: 'game', default: true },
              { label: 'Music', value: 'music' },
              { label: 'Combined', value: 'combined' },
            ),
        ),
      new LabelBuilder()
        .setLabel('Features — choose any')
        .setCheckboxGroupComponent((group) =>
          group
            .setCustomId('features')
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(3)
            .addOptions(
              { label: 'Live stats', value: 'stats' },
              { label: 'Music search', value: 'music' },
              { label: 'Boss tracking', value: 'bosses' },
            ),
        ),
      new LabelBuilder()
        .setLabel('Enable stream reminders?')
        .setCheckboxComponent((checkbox) => checkbox.setCustomId('reminders')),
    );

export const buildPlaygroundShowcase = (userId: string, expiresAt: number) => ({
  content:
    'Try Discord’s modal radio buttons and checkboxes. These demo choices do not change your settings.',
  components: [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`playground:open:${userId}:${expiresAt}`)
        .setLabel('Open modal showcase')
        .setStyle(ButtonStyle.Primary),
    ),
  ],
});

export const formatPlaygroundSubmission = ({
  streamType,
  features,
  reminders,
}: PlaygroundSubmission) =>
  `Modal demo submitted. No settings changed.\nStream type: ${streamType ?? 'none'}\nFeatures: ${features.join(', ') || 'none'}\nReminders: ${reminders ? 'enabled' : 'disabled'}`;

const timestamp = (ms: number) => `<t:${Math.floor(ms / 1_000)}:R>`;

export const buildActivityTrackingReport = (
  instances: readonly TrackedActivityInstance[],
) => {
  if (!instances.length)
    return 'No tracked Activity instances in this environment yet. Open Stats or Music using a bot button first. Tracking resets when the bot restarts.';
  const shown = instances.slice(-3);
  const rows = shown.map((instance) => {
    const connected = instance.participants.filter((user) => user.connected);
    const users =
      connected
        .slice(0, 8)
        .map(
          (user) =>
            `<@${user.userId}> (first seen ${timestamp(user.firstSeenAt)})`,
        )
        .join(', ') || 'none';
    return `Instance: \`${instance.instanceId}\`\nChannel: <#${instance.channelId}>\nLaunch target: ${instance.target ? instance.target.slice(0, 80) : 'Stats'}\nStatus: ${instance.status}\nLast successful check: ${instance.lastCheckedAt === null ? 'pending' : timestamp(instance.lastCheckedAt)}\nConnected at last check (${connected.length}): ${users}${connected.length > 8 ? ', …' : ''}\nLast sampled changes: +${instance.joinedUserIds.length} / −${instance.leftUserIds.length}`;
  });
  return `Activity presence — showing ${shown.length} of ${instances.length} instances.\nSampled every minute; short visits may be missed. Launch targets describe the session, not each user’s current tab or actions. Unavailable snapshots may be stale. Tracking is bounded and resets on restart.\n\n${rows.join('\n\n')}`.slice(
    0,
    1_950,
  );
};
