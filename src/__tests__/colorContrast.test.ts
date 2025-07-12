import { describe, it, expect } from 'vitest';
import { contrastRatio, isContrastSufficient, bestTextColor } from '../utils/colorContrast';

describe('color contrast', () => {
  it('calculates correct ratio for black on white', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(Math.round(ratio * 100) / 100).toBe(21);
  });

  it('detects insufficient contrast', () => {
    expect(isContrastSufficient('#777777', '#ffffff')).toBe(false);
  });

  it('passes sufficient contrast', () => {
    expect(isContrastSufficient('#000000', '#ffffff')).toBe(true);
  });

  it('chooses readable text color', () => {
    expect(bestTextColor('#000000')).toBe('#ffffff');
    expect(bestTextColor('#ffffff')).toBe('#000000');
  });
});
