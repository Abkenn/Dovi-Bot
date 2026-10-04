import type {
  APIComponentInContainer,
  APIMessageTopLevelComponent,
  Message,
  MessageEditOptions,
} from 'discord.js';

export type LifecycleComponent =
  | APIMessageTopLevelComponent
  | APIComponentInContainer;

export type ComponentMessageEditor = (
  options: MessageEditOptions,
) => Promise<unknown>;

export type TrackedComponentMessage = {
  customIds: string[];
  idleExpiresAt: number | null;
  edit: ComponentMessageEditor;
  fetch: () => Promise<Message>;
  timer: NodeJS.Timeout;
  retries: number;
};
