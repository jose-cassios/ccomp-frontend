export interface DesignRect { x: number; y: number; width: number; height: number; }
export interface AlignmentGuide { axis: 'x' | 'y'; position: number; }
export interface SpacingGuide { axis: 'x' | 'y'; start: number; end: number; cross: number; }
export interface SnapResult {
  rect: DesignRect;
  guides: AlignmentGuide[];
  gaps: SpacingGuide[];
  equalWidth?: boolean;
}
interface Candidate { value: number; distance: number; guide?: AlignmentGuide; gaps?: SpacingGuide[]; equalWidth?: boolean; }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const sizeOf = (rect: DesignRect, axis: 'x' | 'y') => axis === 'x' ? rect.width : rect.height;
const anchors = (rect: DesignRect, axis: 'x' | 'y') => [rect[axis], rect[axis] + sizeOf(rect, axis) / 2, rect[axis] + sizeOf(rect, axis)];

function axisSnap(rect: DesignRect, others: DesignRect[], axis: 'x' | 'y', tolerance: number) {
  const size = sizeOf(rect, axis);
  const candidates: Candidate[] = [];
  const add = (value: number, rest: Omit<Candidate, 'value' | 'distance'>) => {
    const distance = Math.abs(value - rect[axis]);
    if (value >= -1e-8 && value + size <= 1 + 1e-8 && distance <= tolerance) {
      candidates.push({ value: clamp(value, 0, Math.max(0, 1 - size)), distance, ...rest });
    }
  };
  for (const target of [0, .5, 1, ...others.flatMap(other => anchors(other, axis))]) {
    for (const offset of [0, size / 2, size]) add(target - offset, { guide: { axis, position: target } });
  }

  // Equal gaps are meaningful only for boxes in the same row or column.
  const cross = axis === 'x' ? 'y' : 'x';
  const neighbors = others.filter(other =>
    Math.min(rect[cross] + sizeOf(rect, cross), other[cross] + sizeOf(other, cross))
      > Math.max(rect[cross], other[cross]),
  ).sort((a, b) => a[axis] - b[axis]);
  const crossPosition = clamp(rect[cross] + sizeOf(rect, cross) / 2, 0, 1);
  const gapLine = (start: number, end: number): SpacingGuide => ({ axis, start, end, cross: crossPosition });
  const addGap = (value: number, gaps: SpacingGuide[]) => {
    if (neighbors.some(other => value < other[axis] + sizeOf(other, axis) - 1e-8 && value + size > other[axis] + 1e-8)) return;
    add(value, { gaps });
  };
  for (let i = 0; i < neighbors.length - 1; i++) {
    const a = neighbors[i]; const b = neighbors[i + 1];
    const aEnd = a[axis] + sizeOf(a, axis); const bEnd = b[axis] + sizeOf(b, axis);
    const gap = b[axis] - aEnd;
    if (gap <= 0) continue;
    if (gap >= size) {
      const middle = aEnd + (gap - size) / 2;
      addGap(middle, [gapLine(aEnd, middle), gapLine(middle + size, b[axis])]);
    }
    addGap(bEnd + gap, [gapLine(aEnd, b[axis]), gapLine(bEnd, bEnd + gap)]);
    addGap(a[axis] - gap - size, [gapLine(a[axis] - gap, a[axis]), gapLine(aEnd, b[axis])]);
  }
  candidates.sort((a, b) => Math.abs(a.distance - b.distance) < 1e-8
    ? Number(Boolean(b.gaps)) - Number(Boolean(a.gaps)) : a.distance - b.distance);
  return candidates[0];
}

/** Tolerances are in visible pixels, so snapping feels consistent at every zoom. */
export function snapMove(rect: DesignRect, others: DesignRect[], viewport: { width: number; height: number }, enabled = true): SnapResult {
  const bounded = { ...rect, x: clamp(rect.x, 0, Math.max(0, 1 - rect.width)), y: clamp(rect.y, 0, Math.max(0, 1 - rect.height)) };
  if (!enabled || !viewport.width || !viewport.height) return { rect: bounded, guides: [], gaps: [] };
  const x = axisSnap(bounded, others, 'x', 6 / viewport.width);
  const y = axisSnap({ ...bounded, x: x?.value ?? bounded.x }, others, 'y', 6 / viewport.height);
  return {
    rect: { ...bounded, x: x?.value ?? bounded.x, y: y?.value ?? bounded.y },
    guides: [x?.guide, y?.guide].filter((guide): guide is AlignmentGuide => Boolean(guide)),
    gaps: [...(x?.gaps ?? []), ...(y?.gaps ?? [])],
  };
}

/** A side handle changes the text container width, never the font size. */
export function snapResize(original: DesignRect, edge: number, side: 'left' | 'right', others: DesignRect[], viewportWidth: number, enabled = true): SnapResult {
  const fixed = side === 'left' ? clamp(original.x + original.width, .01, 1) : clamp(original.x, 0, .99);
  const minimum = .01;
  const min = side === 'left' ? 0 : fixed + minimum;
  const max = side === 'left' ? fixed - minimum : 1;
  let value = clamp(edge, min, max);
  const candidates: Candidate[] = [];
  if (enabled && viewportWidth > 0) {
    const add = (candidate: number, equalWidth = false) => {
      const distance = Math.abs(candidate - value);
      if (candidate >= min && candidate <= max && distance <= 6 / viewportWidth) {
        candidates.push({ value: candidate, distance, equalWidth, guide: { axis: 'x', position: candidate } });
      }
    };
    for (const target of [0, .5, 1, ...others.flatMap(other => anchors(other, 'x'))]) add(target);
    for (const other of others) add(fixed + (side === 'left' ? -other.width : other.width), true);
  }
  candidates.sort((a, b) => Math.abs(a.distance - b.distance) < 1e-8
    ? Number(b.equalWidth) - Number(a.equalWidth) : a.distance - b.distance);
  const match = candidates[0]; value = match?.value ?? value;
  return {
    rect: { ...original, x: side === 'left' ? value : fixed, width: Math.abs(value - fixed) },
    guides: match?.guide ? [match.guide] : [], gaps: [], equalWidth: match?.equalWidth,
  };
}
