import { HeadContent, Scripts } from '@tanstack/react-router';
import { LayoutGroup, MotionConfig } from 'motion/react';
import type { PropsWithChildren } from 'react';

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
        <LayoutGroup id="game-stats-navigation">{children}</LayoutGroup>
      </MotionConfig>
      <Scripts />
    </body>
  </html>
);
