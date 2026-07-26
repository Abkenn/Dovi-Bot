type GameDotLabelProps = {
  index?: number;
  value?: string;
  x?: number;
  y?: number;
};

const LABEL_OFFSETS = [
  { x: -10, y: -16 },
  { x: 12, y: 24 },
  { x: -18, y: -30 },
  { x: 20, y: 38 },
] as const;

export const GameDotLabel = ({
  index = 0,
  value,
  x = 0,
  y = 0,
}: GameDotLabelProps) => {
  if (!value) {
    return null;
  }

  const offset = LABEL_OFFSETS[index % LABEL_OFFSETS.length];

  return (
    <text
      x={x + offset.x}
      y={y + offset.y}
      fill="var(--foreground)"
      fontSize={11}
      fontWeight={600}
      paintOrder="stroke"
      stroke="var(--background)"
      strokeWidth={4}
      textAnchor="middle"
    >
      {value}
    </text>
  );
};
