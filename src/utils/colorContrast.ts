export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const fullHex = normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized;
  const bigint = parseInt(fullHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function luminanceChannel(value: number): number {
  // PRECISION FIX: Use more precise floating point arithmetic
  const channel = value / 255;
  return channel <= 0.03928 
    ? Math.round((channel * 1000000) / 12.92) / 1000000
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = luminanceChannel(r);
  const G = luminanceChannel(g);
  const B = luminanceChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isContrastSufficient(
  foreground: string,
  background: string,
  ratio: number = 4.5,
): boolean {
  return contrastRatio(foreground, background) >= ratio;
}

export function bestTextColor(
  background: string,
  ratio: number = 4.5,
): string {
  const blackContrast = contrastRatio('#000000', background);
  const whiteContrast = contrastRatio('#ffffff', background);
  
  if (blackContrast >= ratio && whiteContrast >= ratio) {
    return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
  }
  if (blackContrast >= ratio) return '#000000';
  if (whiteContrast >= ratio) return '#ffffff';
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}
