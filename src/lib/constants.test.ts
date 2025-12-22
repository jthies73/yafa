import { describe, expect, it } from '@jest/globals';

import {
	DefaultProgressionSettings,
	ProgressionType,
	getDefaultSettings,
	isValidProgressionType,
} from './constants';

describe('ProgressionType Constants', () => {
	it('should define all required progression types', () => {
		expect(ProgressionType.RPE_AUTOREG).toBe('RPE_AUTOREG');
		expect(ProgressionType.LINKED_BACKOFF).toBe('LINKED_BACKOFF');
		expect(ProgressionType.DOUBLE_PROGRESSION).toBe('DOUBLE_PROGRESSION');
		expect(ProgressionType.LINEAR_FIXED).toBe('LINEAR_FIXED');
		expect(ProgressionType.AMRAP_AUTOREG).toBe('AMRAP_AUTOREG');
	});

	it('should be frozen (immutable)', () => {
		expect(Object.isFrozen(ProgressionType)).toBe(true);
	});

	it('should not allow modification of values', () => {
		const originalValue = ProgressionType.RPE_AUTOREG;
		try {
			// @ts-expect-error - Testing immutability
			ProgressionType.RPE_AUTOREG = 'MODIFIED';
		} catch {
			// Expected in strict mode
		}
		expect(ProgressionType.RPE_AUTOREG).toBe(originalValue);
	});
});

describe('DefaultProgressionSettings', () => {
	it('should have settings for all progression types', () => {
		expect(DefaultProgressionSettings[ProgressionType.RPE_AUTOREG]).toBeDefined();
		expect(DefaultProgressionSettings[ProgressionType.LINKED_BACKOFF]).toBeDefined();
		expect(DefaultProgressionSettings[ProgressionType.DOUBLE_PROGRESSION]).toBeDefined();
		expect(DefaultProgressionSettings[ProgressionType.LINEAR_FIXED]).toBeDefined();
		expect(DefaultProgressionSettings[ProgressionType.AMRAP_AUTOREG]).toBeDefined();
	});

	it('should be frozen (immutable)', () => {
		expect(Object.isFrozen(DefaultProgressionSettings)).toBe(true);
	});

	it('should have valid RPE_AUTOREG settings', () => {
		const settings = DefaultProgressionSettings[ProgressionType.RPE_AUTOREG];
		expect(settings.targetRpe).toBeGreaterThanOrEqual(6);
		expect(settings.targetRpe).toBeLessThanOrEqual(10);
		expect(settings.targetReps).toBeGreaterThan(0);
		expect(settings.incrementOnSuccess).toBeGreaterThan(0);
		expect(settings.rpeTolerance).toBeGreaterThan(0);
	});

	it('should have valid LINKED_BACKOFF settings', () => {
		const settings = DefaultProgressionSettings[ProgressionType.LINKED_BACKOFF];
		expect(settings.offsetPct).toBeDefined();
		expect(typeof settings.offsetPct).toBe('number');
		expect(settings.parentEntryId).toBeNull();
	});

	it('should have valid DOUBLE_PROGRESSION settings', () => {
		const settings = DefaultProgressionSettings[ProgressionType.DOUBLE_PROGRESSION];
		expect(settings.repFloor).toBeGreaterThan(0);
		expect(settings.repCeiling).toBeGreaterThan(settings.repFloor);
		expect(settings.weightIncrement).toBeGreaterThan(0);
	});

	it('should have valid LINEAR_FIXED settings', () => {
		const settings = DefaultProgressionSettings[ProgressionType.LINEAR_FIXED];
		expect(settings.fixedIncrement).toBeGreaterThan(0);
		expect(settings.targetReps).toBeGreaterThan(0);
		expect(settings.targetSets).toBeGreaterThan(0);
	});

	it('should have valid AMRAP_AUTOREG settings', () => {
		const settings = DefaultProgressionSettings[ProgressionType.AMRAP_AUTOREG];
		expect(settings.minReps).toBeGreaterThan(0);
		expect(settings.incrementPerBonusRep).toBeGreaterThan(0);
		expect(settings.maxIncrement).toBeGreaterThan(0);
	});
});

describe('isValidProgressionType', () => {
	it('should return true for valid progression types', () => {
		expect(isValidProgressionType(ProgressionType.RPE_AUTOREG)).toBe(true);
		expect(isValidProgressionType(ProgressionType.LINKED_BACKOFF)).toBe(true);
		expect(isValidProgressionType(ProgressionType.DOUBLE_PROGRESSION)).toBe(true);
		expect(isValidProgressionType(ProgressionType.LINEAR_FIXED)).toBe(true);
		expect(isValidProgressionType(ProgressionType.AMRAP_AUTOREG)).toBe(true);
	});

	it('should return false for invalid progression types', () => {
		expect(isValidProgressionType('INVALID_TYPE')).toBe(false);
		expect(isValidProgressionType('')).toBe(false);
		expect(isValidProgressionType(null as unknown as string)).toBe(false);
		expect(isValidProgressionType(undefined as unknown as string)).toBe(false);
		expect(isValidProgressionType(123 as unknown as string)).toBe(false);
	});
});

describe('getDefaultSettings', () => {
	it('should return default settings for valid progression types', () => {
		const rpeSettings = getDefaultSettings(ProgressionType.RPE_AUTOREG) as { targetRpe?: number; targetReps?: number };
		expect(rpeSettings).toBeDefined();
		expect(rpeSettings?.targetRpe).toBeDefined();
		expect(rpeSettings?.targetReps).toBeDefined();
	});

	it('should return a copy of settings (not reference)', () => {
		const settings1 = getDefaultSettings(ProgressionType.RPE_AUTOREG);
		const settings2 = getDefaultSettings(ProgressionType.RPE_AUTOREG);
		expect(settings1).not.toBe(settings2); // Different objects
		expect(settings1).toEqual(settings2); // Same values
	});

	it('should return null for invalid progression types', () => {
		expect(getDefaultSettings('INVALID_TYPE')).toBeNull();
		expect(getDefaultSettings(null as unknown as string)).toBeNull();
		expect(getDefaultSettings(undefined as unknown as string)).toBeNull();
	});

	it('should return mutable copies that do not affect original', () => {
		const settings = getDefaultSettings(ProgressionType.RPE_AUTOREG) as { targetRpe?: number };
		const originalValue = settings?.targetRpe;
		if (settings) {
			settings.targetRpe = 999;
		}
		
		const freshSettings = getDefaultSettings(ProgressionType.RPE_AUTOREG) as { targetRpe?: number };
		expect(freshSettings?.targetRpe).toBe(originalValue);
		expect(freshSettings?.targetRpe).not.toBe(999);
	});
});
