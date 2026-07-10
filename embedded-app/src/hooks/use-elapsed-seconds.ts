import { useEffect, useState } from 'react';

const secondsSince = (startedAt: string | null) => {
  if (!startedAt) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1_000),
  );
};

export const useElapsedSeconds = (
  startedAt: string | null,
  paused: boolean,
) => {
  const [seconds, setSeconds] = useState(() => secondsSince(startedAt));

  useEffect(() => {
    setSeconds(secondsSince(startedAt));

    if (!startedAt || paused) {
      return;
    }

    const interval = window.setInterval(() => {
      setSeconds(secondsSince(startedAt));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [paused, startedAt]);

  return seconds;
};
