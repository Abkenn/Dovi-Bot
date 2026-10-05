export const compressBossStat = (value: number, threshold: number) =>
  value <= threshold
    ? value
    : threshold +
      (threshold / 2) * Math.log1p((value - threshold) / (threshold / 2));

export const expandBossStat = (value: number, threshold: number) =>
  value <= threshold
    ? value
    : threshold +
      (threshold / 2) * Math.expm1((value - threshold) / (threshold / 2));
