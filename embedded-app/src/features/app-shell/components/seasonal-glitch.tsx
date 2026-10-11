import { Eye } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export const SeasonalGlitch = ({ enabled }: { enabled: boolean }) => {
  const reducedMotion = useReducedMotion();
  const hasShown = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || reducedMotion !== false) {
      setVisible(false);
      return;
    }
    if (hasShown.current) return;
    const timer = window.setTimeout(() => {
      hasShown.current = true;
      setVisible(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [enabled, reducedMotion]);

  if (!enabled || reducedMotion !== false || !visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="seasonal-glitch pointer-events-none fixed right-5 top-16 z-50 text-[#d64949]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.75, 0.12, 0.6, 0], x: [0, -2, 2, -1, 0] }}
      transition={{ duration: 0.45, ease: 'linear' }}
      onAnimationComplete={() => setVisible(false)}
    >
      <Eye size={36} strokeWidth={1.2} />
    </motion.div>
  );
};
