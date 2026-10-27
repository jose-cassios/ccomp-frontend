import { DesignRect, snapMove, snapResize } from './certificate-guides';

describe('Certificate smart guides', () => {
  const viewport = { width: 1000, height: 1000 };
  const rect = (x: number, y = .2, width = .1, height = .1): DesignRect => ({ x, y, width, height });
  it('snaps page centers and sibling edges within six visible pixels', () => {
    const centered = snapMove(rect(.347, .447, .3), [], viewport);
    expect(centered.rect.x).toBeCloseTo(.35); expect(centered.rect.y).toBeCloseTo(.45);
    expect(centered.guides).toContainEqual({ axis: 'x', position: .5 });
    const aligned = snapMove(rect(.203), [rect(.2, .6, .25)], viewport);
    expect(aligned.rect.x).toBe(.2);
  });
  it('snaps the middle box to equal horizontal and vertical gaps', () => {
    const horizontal = snapMove(rect(.348), [rect(.1), rect(.6)], viewport);
    expect(horizontal.rect.x).toBeCloseTo(.35);
    const gaps = horizontal.gaps.filter(gap => gap.axis === 'x');
    expect(gaps).toHaveLength(2);
    expect(gaps[0].end - gaps[0].start).toBeCloseTo(gaps[1].end - gaps[1].start);
    const vertical = snapMove(rect(.2, .348), [rect(.2, .1), rect(.2, .6)], viewport);
    expect(vertical.rect.y).toBeCloseTo(.35); expect(vertical.gaps[0].axis).toBe('y');
  });
  it('continues an existing equal-gap sequence and ignores unrelated rows', () => {
    const result = snapMove(rect(.503), [rect(.1), rect(.3)], viewport);
    expect(result.rect.x).toBeCloseTo(.5); expect(result.gaps).toHaveLength(2);
    const unrelated = snapMove(rect(.348, .8), [rect(.1), rect(.6)], viewport);
    expect(unrelated.gaps).toHaveLength(0);
  });
  it('uses pixel-based tolerance at zoom and can bypass all guides', () => {
    expect(snapMove(rect(.345, .2, .3), [], viewport).rect.x).toBeCloseTo(.35);
    expect(snapMove(rect(.345, .2, .3), [], { width: 2000, height: 1000 }).rect.x).toBe(.345);
    const free = snapMove(rect(.347, .2, .3), [], viewport, false);
    expect(free.rect.x).toBe(.347); expect(free.guides).toEqual([]);
  });
  it('resizes from either side while fixing the opposite edge and respecting limits', () => {
    const right = snapResize(rect(.2, .3, .4), 1.2, 'right', [], 1000);
    expect(right.rect.x).toBe(.2); expect(right.rect.width).toBeCloseTo(.8);
    const left = snapResize(rect(.2, .3, .4), -.3, 'left', [], 1000);
    expect(left.rect.x).toBe(0); expect(left.rect.width).toBeCloseTo(.6);
    const narrow = snapResize(rect(.2, .3, .4), 1, 'left', [], 1000);
    expect(narrow.rect.width).toBeCloseTo(.01); expect(narrow.rect.y).toBe(.3);
  });
  it('matches widths and retains free resize when snapping is off', () => {
    const equal = snapResize(rect(.1, .2, .2), .499, 'right', [rect(.55, .6, .4)], 1000);
    expect(equal.rect.width).toBeCloseTo(.4); expect(equal.equalWidth).toBe(true);
    const free = snapResize(rect(.1, .2, .2), .499, 'right', [rect(.55, .6, .4)], 1000, false);
    expect(free.rect.width).toBeCloseTo(.399); expect(free.guides).toEqual([]);
  });
  it('keeps movement and minimum width valid at the page boundaries', () => {
    const moved = snapMove(rect(2, -.2, .3), [], viewport);
    expect(moved.rect.x).toBe(.7); expect(moved.rect.y).toBe(0);
    const resized = snapResize(rect(1, .2, .3), 2, 'right', [], 1000);
    expect(resized.rect.width).toBeCloseTo(.01); expect(resized.rect.x + resized.rect.width).toBe(1);
  });
});
