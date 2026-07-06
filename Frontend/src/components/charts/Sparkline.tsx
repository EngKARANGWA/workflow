export function Sparkline({
  values,
  accent,
  width = 64,
  height = 28,
}: {
  values: number[];
  accent: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2] as const);

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const lastSegment = points.slice(-2);
  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block shrink-0"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-300 dark:text-neutral-700" />
      <path
        d={`M${lastSegment[0][0]},${lastSegment[0][1]} L${lastSegment[1][0]},${lastSegment[1][1]}`}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r={2.5} fill={accent} />
    </svg>
  );
}
