import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
  strokeWidth?: number;
};

/** Thin, even strokes so the icons sit with the type instead of shouting over it. */
function stroke(color: string, strokeWidth: number) {
  return {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
}

export function PlusIcon({ color, size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M12 5v14M5 12h14" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ArrowRightIcon({ color, size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M5 12h14M13 6l6 6-6 6" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronRightIcon({ color, size = 18, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M9 5l7 7-7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 16, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function SearchIcon({ color, size = 20, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={11} cy={11} r={6.5} {...stroke(color, strokeWidth)} />
      <Path d="M16 16l4 4" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function CloseIcon({ color, size = 16, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M6 6l12 12M18 6L6 18" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function DownloadIcon({ color, size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ExternalIcon({ color, size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M8 16L17 7M9 7h8v8" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function PenIcon({ color, size = 20, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 20c3-1 4.5-3.5 6-6l7.5-8.5a2 2 0 013 2.8L12 15.5c-2.5 1.5-5 3-8 4.5z" {...stroke(color, strokeWidth)} />
      <Path d="M14 20h6" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function TrashIcon({ color, size = 22, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10.5 10v6M13.5 10v6" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function LockIcon({ color, size = 14, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Rect height={9} rx={2} width={14} x={5} y={11} {...stroke(color, strokeWidth)} />
      <Path d="M8 11V8a4 4 0 018 0v3" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

/**
 * The DSSV mark from the app icon: a roof, the chimney, and the sweep's brush
 * coming out of it. Drawn in vectors so it stays sharp at any size.
 */
export function ChimneyMark({
  color,
  size = 32,
  brush = true,
}: {
  color: string;
  size?: number;
  /** The sweep's brush on top. Left off where smoke rises from the chimney instead. */
  brush?: boolean;
}) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <Path d="M62 942L512 532L962 942Z" fill={color} />
      {/* Runs down past the roof line (y≈793 at its right edge) so it sits in the roof. */}
      <Rect fill={color} height={440} rx={12} width={164} x={635} y={373} />
      <Rect fill={color} height={72} rx={18} width={246} x={594} y={302} />
      {brush ? (
        <>
          <Rect fill={color} height={92} rx={18} width={52} x={691} y={212} />
          <Circle cx={717} cy={120} fill={color} r={96} />
        </>
      ) : null}
    </Svg>
  );
}
