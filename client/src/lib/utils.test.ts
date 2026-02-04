// AI-META-BEGIN
// AI-META: Test file for utils.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for lib/utils.ts utility functions.
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils - cn() function', () => {
  it('should combine simple class names', () => {
    const result = cn('class1', 'class2', 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('should handle conditional classes', () => {
    const result = cn('always', false && 'never', true && 'included');
    expect(result).toContain('always');
    expect(result).toContain('included');
    expect(result).not.toContain('never');
  });

  it('should merge conflicting Tailwind classes (keep last)', () => {
    const result = cn('px-2 py-1', 'py-2');
    expect(result).toBe('px-2 py-2');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('should handle objects with conditional values', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true,
    });
    expect(result).toContain('class1');
    expect(result).toContain('class3');
    expect(result).not.toContain('class2');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should filter out null and undefined', () => {
    const result = cn('class1', null, undefined, 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('should merge responsive classes correctly', () => {
    const result = cn('md:px-2 md:py-1', 'md:py-3');
    expect(result).toBe('md:px-2 md:py-3');
  });

  it('should merge hover and focus classes correctly', () => {
    const result = cn('hover:bg-blue-500', 'hover:bg-red-500');
    expect(result).toBe('hover:bg-red-500');
  });
});
