import { HeadContent, Scripts } from '@tanstack/react-router';
import { LayoutGroup, MotionConfig } from 'motion/react';
import type { PropsWithChildren } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueryProvider } from './query-provider';

type RootDocumentProps = PropsWithChildren;

export const RootDocument = ({ children }: RootDocumentProps) => (
  <html lang="en" className="dark">
    <head>
      <HeadContent />
    </head>
    <body className="activity-compact:overflow-hidden">
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <QueryProvider>
          <ScrollArea className="activity-scroll-frame h-svh w-full">
            <LayoutGroup id="game-stats-navigation">{children}</LayoutGroup>
          </ScrollArea>
        </QueryProvider>
      </MotionConfig>
      <Scripts />
    </body>
  </html>
);
