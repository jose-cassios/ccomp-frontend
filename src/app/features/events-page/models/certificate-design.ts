/** Java's certificate renderer uses #AARRGGBB, unlike CSS's #RRGGBBAA. */
export function certificateColor(value: string | null) {
  const hex = /^#([\da-f]{6}|[\da-f]{8})$/i.test(value ?? '') ? value! : '#000000';
  const rgb = hex.length === 9 ? `#${hex.slice(3)}` : hex;
  const alpha = hex.length === 9 ? parseInt(hex.slice(1, 3), 16) : 255;
  return { rgb, opacity: Math.round(alpha / 255 * 100), css: `${rgb}${alpha.toString(16).padStart(2, '0')}` };
}

export function certificateHex(rgb: string, opacity: number): string {
  const alpha = Math.round(Math.max(0, Math.min(100, opacity)) / 100 * 255);
  return alpha === 255 ? rgb : `#${alpha.toString(16).padStart(2, '0')}${rgb.slice(1)}`;
}

export interface CertificateTextRun { text: string; style: 'plain' | 'bold' | 'italic' | 'strike'; }

/** Matches the renderer's limited Markdown without interpreting HTML. */
export function certificateTextRuns(text: string, samples: Record<string, string>): CertificateTextRun[] {
  const resolved = text.replace(/\{[^{}]+\}/g, token => samples[token] ?? token);
  const runs: CertificateTextRun[] = [];
  const pattern = /~~(.*?)~~|\*\*(.*?)\*\*|\*(.*?)\*/g;
  let previous = 0;
  for (const match of resolved.matchAll(pattern)) {
    if (match.index > previous) runs.push({ text: resolved.slice(previous, match.index), style: 'plain' });
    runs.push({ text: match[1] ?? match[2] ?? match[3], style: match[1] !== undefined ? 'strike' : match[2] !== undefined ? 'bold' : 'italic' });
    previous = match.index + match[0].length;
  }
  if (previous < resolved.length) runs.push({ text: resolved.slice(previous), style: 'plain' });
  return runs;
}
