import { type PropsWithChildren, ViewTransition } from 'react';

type SeasonalPageTransitionProps = PropsWithChildren<{
  enabled: boolean;
  page: string;
}>;

export const SeasonalPageTransition = ({
  enabled,
  page,
  children,
}: SeasonalPageTransitionProps) => (
  <>
    {enabled && (
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        className="absolute pointer-events-none"
      >
        <defs>
          <filter id="seasonal-screen-static" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="1"
              seed="7"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 0.025"
              result="static"
            />
            <feBlend in="SourceGraphic" in2="static" mode="screen" />
          </filter>
        </defs>
      </svg>
    )}
    <ViewTransition
      key={page}
      name="activity-page"
      default="none"
      share={enabled ? 'seasonal-screen-glitch' : 'none'}
    >
      <div>{children}</div>
    </ViewTransition>
  </>
);
