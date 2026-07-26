type GameDotLabelProps = {
  index?: number;
  value?: string;
  x?: number;
  y?: number;
};

const LABEL_OFFSETS = [{ y: -16 }, { y: 24 }, { y: -32 }, { y: 40 }] as const;

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
  const lineStartY = offset.y < 0 ? y - 8 : y + 8;
  const lineEndY = offset.y < 0 ? y + offset.y + 4 : y + offset.y - 12;

  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={lineStartY}
        y2={lineEndY}
        stroke="var(--muted-foreground)"
        strokeOpacity={0.45}
        strokeWidth={1}
      />
      <text
        x={x}
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
    </g>
  );
};
