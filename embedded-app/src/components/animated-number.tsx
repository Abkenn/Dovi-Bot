import { motion } from 'motion/react';
import { useAnimatedNumber } from '@/hooks/use-animated-number';

type AnimatedNumberProps = {
  value: number;
  className?: string;
  cacheKey?: string;
  suffix?: string;
};

export const AnimatedNumber = ({
  value,
  className,
  cacheKey,
  suffix,
}: AnimatedNumberProps) => {
  const { displayValue, visit } = useAnimatedNumber({ value, cacheKey });

  if (suffix) {
    return (
      <span className={className} data-animation-visit={visit}>
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <motion.span
      className={className}
      aria-label={String(value)}
      data-animation-visit={visit}
    >
      {displayValue}
    </motion.span>
  );
};
