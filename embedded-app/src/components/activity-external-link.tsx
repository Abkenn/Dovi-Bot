import type { ComponentProps, MouseEvent } from 'react';
import { useState } from 'react';
import { getActivityLinkOpener } from '@/lib/activity-links';

type ActivityExternalLinkProps = ComponentProps<'a'> & { href: string };

export const ActivityExternalLink = ({
  href,
  children,
  ...props
}: ActivityExternalLinkProps) => {
  const [failed, setFailed] = useState(false);
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    const opener = getActivityLinkOpener();
    if (!opener || event.defaultPrevented) return;
    event.preventDefault();
    setFailed(false);
    void opener(href).catch(() => setFailed(true));
  };
  return (
    <>
      <a {...props} href={href} onClick={open} onAuxClick={open}>
        {children}
      </a>
      {failed ? (
        <p role="alert" className="mt-1 text-xs text-muted-foreground">
          Could not open the link. Click the track to try again.
        </p>
      ) : null}
    </>
  );
};
