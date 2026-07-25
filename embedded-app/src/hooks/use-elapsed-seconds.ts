import { useEffect, useState } from 'react';

const elapsedSeconds = (startedAt: string | null, stoppedAt: string | null) => {
  if (!startedAt) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      ((stoppedAt ? new Date(stoppedAt).getTime() : Date.now()) -
        new Date(startedAt).getTime()) /
        1_000,
    ),
  );
};

export const useElapsedSeconds = (
  startedAt: string | null,
  stoppedAt: string | null,
) => {
  const [seconds, setSeconds] = useState(() =>
    elapsedSeconds(startedAt, stoppedAt),
  );

  useEffect(() => {
    setSeconds(elapsedSeconds(startedAt, stoppedAt));

    if (!startedAt || stoppedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setSeconds(elapsedSeconds(startedAt, null));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [startedAt, stoppedAt]);

  return seconds;
};
