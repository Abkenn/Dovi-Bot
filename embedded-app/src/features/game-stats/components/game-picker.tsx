import { Popover } from '@base-ui/react/popover';
import { Link } from '@tanstack/react-router';
import { Check, ChevronDown, Gamepad2 } from 'lucide-react';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ArchivedGame } from '@/live-stats.types';

type GamePickerProps = { games: ArchivedGame[]; selectedGameId: string | null };

export const GamePicker = ({ games, selectedGameId }: GamePickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = games.find((game) => game.id === selectedGameId);
  const matching = games.filter((game) =>
    game.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <Popover.Trigger
        aria-label={selected ? `Choose game: ${selected.name}` : 'Choose game'}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'min-w-0 gap-1.5 px-2.5 sm:max-w-56',
          selected &&
            'border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        <Gamepad2 className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{selected?.name ?? 'Games'}</span>
        <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={8}
          align="start"
          className="game-picker-positioner z-50"
        >
          <Popover.Popup
            aria-label="Choose a game"
            className="w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl outline-none"
          >
            <Popover.Title className="sr-only">Choose a game</Popover.Title>
            <Input
              aria-label="Find a game"
              placeholder="Find a game…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ScrollArea className="mt-2 h-64 max-h-[40svh]">
              <div className="space-y-0.5 pr-2">
                {matching.map((game) => (
                  <Link
                    key={game.id}
                    to="/games/$gameId"
                    params={{ gameId: game.id }}
                    aria-current={
                      game.id === selectedGameId ? 'page' : undefined
                    }
                    onClick={() => {
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                      game.id === selectedGameId &&
                        'bg-primary/10 text-primary',
                    )}
                  >
                    <span className="min-w-0 break-words">{game.name}</span>
                    {game.id === selectedGameId ? (
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                    ) : null}
                  </Link>
                ))}
                {!matching.length ? (
                  <p
                    role="status"
                    className="p-3 text-sm text-muted-foreground"
                  >
                    No matching games
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
