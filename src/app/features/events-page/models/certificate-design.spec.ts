import { certificateColor, certificateHex, certificateTextRuns } from './certificate-design';

describe('Certificate design conversions', () => {
  it('maps Java ARGB to the color picker and CSS without losing transparency', () => {
    expect(certificateColor('#80123b6a')).toEqual({ rgb: '#123b6a', opacity: 50, css: '#123b6a80' });
    expect(certificateHex('#123b6a', 50)).toBe('#80123b6a');
    expect(certificateHex('#123b6a', 100)).toBe('#123b6a');
    expect(certificateHex('#ffffff', 0)).toBe('#00ffffff');
  });
  it('uses the renderer default for empty or invalid colors', () => {
    expect(certificateColor(null).css).toBe('#000000ff');
    expect(certificateColor('not a color').rgb).toBe('#000000');
  });
  it('replaces sample variables and formats only supported Markdown', () => {
    expect(certificateTextRuns('Olá **{participante.nome}**, *bem-vinda* ~~teste~~.', { '{participante.nome}': 'Ana' }))
      .toEqual([{ text: 'Olá ', style: 'plain' }, { text: 'Ana', style: 'bold' },
        { text: ', ', style: 'plain' }, { text: 'bem-vinda', style: 'italic' },
        { text: ' ', style: 'plain' }, { text: 'teste', style: 'strike' }, { text: '.', style: 'plain' }]);
  });
  it('leaves HTML as plain text and preserves newlines and unknown variables', () => {
    expect(certificateTextRuns('<img src=x>\n{unknown}', {})).toEqual([{ text: '<img src=x>\n{unknown}', style: 'plain' }]);
  });
});
