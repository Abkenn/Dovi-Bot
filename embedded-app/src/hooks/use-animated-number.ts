import { animate, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';

type UseAnimatedNumberOptions = {
  value: number;
  cacheKey?: string;
};

type AnimationVisit = 'first' | 'returning';

const visitedNumbers = new Set<string>();

export const useAnimatedNumber = ({
  value,
  cacheKey,
}: UseAnimatedNumberOptions) => {
  const animatedValue = useMotionValue(0);
  const displayValue = useTransform(animatedValue, (latest) =>
    String(Math.round(latest)),
  );
  const visit = useRef<AnimationVisit>(
    cacheKey !== undefined && visitedNumbers.has(cacheKey)
      ? 'returning'
      : 'first',
  );
  const hasAnimated = useRef(false);

  useEffect(() => {
    let duration = 0.55;
    if (hasAnimated.current) {
      duration = 0.25;
    } else if (visit.current === 'returning') {
      duration = 0.055;
    }

    const controls = animate(animatedValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    hasAnimated.current = true;
    if (cacheKey !== undefined) {
      visitedNumbers.add(cacheKey);
    }

    return controls.stop;
  }, [animatedValue, cacheKey, value]);

  return { displayValue, visit: visit.current };
};
