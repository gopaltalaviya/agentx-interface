import {describe, expect, it} from 'vitest';
import {formatUnits} from './api';

/**
 * `formatUnits` turns base units into something a person reads, and it is the
 * only place in this repo that touches money.
 *
 * It had no tests. That is the wrong shape for a function whose failure mode
 * is a number on screen that is wrong by a factor of a million — during a
 * demo whose entire claim is that the payments are real.
 *
 * The rule it must never break: **the string is the source of truth.** A
 * uint128 amount exceeds 2^53, so anything that routes through a JS number
 * loses precision silently, and the first symptom is a total that does not
 * reconcile with the chain.
 */

describe('formatUnits', () => {
  it('converts USDC base units to a readable amount', () => {
    expect(formatUnits('20000')).toBe('0.02');
    expect(formatUnits('1000000')).toBe('1');
    expect(formatUnits('1500000')).toBe('1.5');
  });

  it('keeps a leading zero rather than emitting a bare dot', () => {
    expect(formatUnits('1')).toBe('0.000001');
    expect(formatUnits('10')).toBe('0.00001');
  });

  it('renders zero as zero', () => {
    expect(formatUnits('0')).toBe('0');
  });

  it('strips trailing zeros without stripping the value', () => {
    expect(formatUnits('100000')).toBe('0.1');
    expect(formatUnits('10000000')).toBe('10');
  });

  /**
   * The one that matters. 2^53 is about 9e15; a uint128 amount is far larger,
   * so an implementation that parsed to a Number would round here and be
   * quietly wrong about a payment.
   */
  it('is exact beyond the range a JS number can represent', () => {
    expect(formatUnits('123456789012345678901234567890')).toBe('123456789012345678901234.56789');
    expect(formatUnits('9007199254740993')).toBe('9007199254.740993');
  });

  it('handles a different decimal count', () => {
    expect(formatUnits('1000000000000000000', 18)).toBe('1');
    expect(formatUnits('1', 18)).toBe('0.000000000000000001');
  });

  it('keeps the sign on a negative amount', () => {
    expect(formatUnits('-20000')).toBe('-0.02');
  });
});
