import { motion } from 'motion/react';

type TrendExplanationProps = {
  description: string;
};

export const TrendExplanation = ({ description }: TrendExplanationProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.08 }}
    className="pointer-events-none absolute top-3 right-3 z-20 max-w-72 rounded-lg border border-primary/25 bg-card/98 px-3 py-2 text-xs shadow-[0_0_20px_oklch(0.65_0.225_20/0.08)] backdrop-blur"
  >
    <p className="font-semibold text-foreground">Difficulty trend</p>
    <p className="text-muted-foreground">{description}</p>
  </motion.div>
);
