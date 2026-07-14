import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';

type AnimatedNumberProps = {
  value: number;
  className?: string;
};

export const AnimatedNumber = ({ value, className }: AnimatedNumberProps) => {
  const animatedValue = useMotionValue(0);
  const roundedValue = useTransform(animatedValue, (latest) =>
    String(Math.round(latest)),
  );

  useEffect(() => {
    const controls = animate(animatedValue, value, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    });

    return controls.stop;
  }, [animatedValue, value]);

  return (
    <motion.span className={className} aria-label={String(value)}>
      {roundedValue}
    </motion.span>
  );
};
