export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function luminanceChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = luminanceChannel(r);
  const G = luminanceChannel(g);
  const B = luminanceChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(foreground: string, background: string): number {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isContrastSufficient(
  foreground: string,
  background: string,
  ratio: number = 4.5,
): boolean {
  return contrastRatio(foreground, background) >= ratio;
}
