import { motion } from 'motion/react';
import { useAnimatedNumber } from '@/hooks/use-animated-number';

type AnimatedNumberProps = {
  value: number;
  className?: string;
  cacheKey?: string;
};

export const AnimatedNumber = ({
  value,
  className,
  cacheKey,
}: AnimatedNumberProps) => {
  const { displayValue, visit } = useAnimatedNumber({ value, cacheKey });

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
