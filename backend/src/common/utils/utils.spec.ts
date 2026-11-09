import { distanceMeters, randomShift } from './geo';
import { generateToken, hashToken } from './tokens';
import { numericTransformer } from '../transformers';

describe('Geographic privacy and persisted values', () => {
  const point = { latitude: 50.45, longitude: 30.52 };
  it('calculates symmetric distances in metres including identical and antipodal points', () => {
    expect(distanceMeters(point, point)).toBe(0);
    const other = { latitude: 50.46, longitude: 30.52 };
    expect(distanceMeters(point, other)).toBeCloseTo(1111.95, 1);
    expect(distanceMeters(point, other)).toBe(distanceMeters(other, point));
    expect(
      distanceMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 180 },
      ),
    ).toBeCloseTo(Math.PI * 6371000);
  });
  it.each([0, 0.25, 0.5, 0.999999])(
    'keeps public positions in the privacy radius for random value %s',
    (random) => {
      const shifted = randomShift(point, 50, 300, () => random);
      const distance = distanceMeters(point, shifted);
      expect(distance).toBeGreaterThanOrEqual(49.9);
      expect(distance).toBeLessThanOrEqual(300.1);
      expect(shifted).not.toEqual(point);
    },
  );
  it('wraps longitude at the date line', () => {
    const shifted = randomShift(
      { latitude: 0, longitude: 179.9999 },
      300,
      300,
      () => 0.25,
    );
    expect(shifted.longitude).toBeGreaterThanOrEqual(-180);
    expect(shifted.longitude).toBeLessThan(0);
  });
  it('generates opaque distinct tokens and stores deterministic hashes', () => {
    const first = generateToken();
    const second = generateToken();
    expect(first).toMatch(/^[\w-]{43}$/);
    expect(first).not.toBe(second);
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hashToken(first)).not.toContain(first);
  });
  it('converts PostgreSQL numeric values without losing nulls', () => {
    expect(numericTransformer.from('12.75')).toBe(12.75);
    expect(numericTransformer.from(null)).toBeNull();
    expect(numericTransformer.from(undefined)).toBeUndefined();
    expect(numericTransformer.to(0)).toBe(0);
  });
});
