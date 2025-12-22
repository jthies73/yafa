import { describe, expect, it } from "@jest/globals";

import { calculateE1RM } from "@/lib/utils/rmCalculator.ts";

describe("RmCalculator", () => {
	it("[ BENCHPRESS ] should calculate 1RM correctly for a double at RPE 9.5 in", () => {
		const weight = 130;
		const reps = 2;
		const rpe = 9.5;
		const resultBrzycki = calculateE1RM(weight, reps, rpe, "brzycki");
		const resultLander = calculateE1RM(weight, reps, rpe, "lander");
		const resultOConner = calculateE1RM(weight, reps, rpe, "o_conner");
		const resultWathan = calculateE1RM(weight, reps, rpe, "wathan");

		expect(resultBrzycki).toBeGreaterThanOrEqual(135);
		expect(resultBrzycki).toBeLessThanOrEqual(140);
		expect(resultLander).toBeGreaterThanOrEqual(135);
		expect(resultLander).toBeLessThanOrEqual(140);
		expect(resultOConner).toBeGreaterThanOrEqual(135);
		expect(resultOConner).toBeLessThanOrEqual(140);
		expect(resultWathan).toBeGreaterThanOrEqual(135);
		expect(resultWathan).toBeLessThanOrEqual(140);
	});

	it("[ BENCHPRESS ] calculate 1RM correctly for 10 reps at RPE 9.5", () => {
		const weight = 110;
		const reps = 10;
		const rpe = 10;
		const resultLombardi = calculateE1RM(weight, reps, rpe, "lombardi");
		const resultOConner = calculateE1RM(weight, reps, rpe, "o_conner");

		expect(resultLombardi).toBeGreaterThanOrEqual(135);
		expect(resultLombardi).toBeLessThanOrEqual(140);
		expect(resultOConner).toBeGreaterThanOrEqual(135);
		expect(resultOConner).toBeLessThanOrEqual(140);
	});

	it("[ BENCHPRESS ] calculate 1RM correctly for 15 reps at RPE 10", () => {
		const weight = 100;
		const reps = 15;
		const rpe = 10;
		const resultMayhew = calculateE1RM(weight, reps, rpe, "mayhew");
		const resultOConner = calculateE1RM(weight, reps, rpe, "o_conner");

		expect(resultMayhew).toBeGreaterThanOrEqual(135);
		expect(resultMayhew).toBeLessThanOrEqual(142);
		expect(resultOConner).toBeGreaterThanOrEqual(135);
		expect(resultOConner).toBeLessThanOrEqual(140);
	});

	it("[ MILITARY ] calculate 1RM correctly for 3 reps at RPE 9.5", () => {
		const weight = 80;
		const reps = 3;
		const rpe = 9.5;
		const resultEpley = calculateE1RM(weight, reps, rpe, "epley");
		const resultBrzycki = calculateE1RM(weight, reps, rpe, "brzycki");
		const resultLander = calculateE1RM(weight, reps, rpe, "lander");
		const resultOConner = calculateE1RM(weight, reps, rpe, "o_conner");
		const resultWathan = calculateE1RM(weight, reps, rpe, "wathan");

		expect(resultEpley).toBeGreaterThanOrEqual(85);
		expect(resultEpley).toBeLessThanOrEqual(90);
		expect(resultBrzycki).toBeGreaterThanOrEqual(85);
		expect(resultBrzycki).toBeLessThanOrEqual(90);
		expect(resultLander).toBeGreaterThanOrEqual(85);
		expect(resultLander).toBeLessThanOrEqual(90);
		expect(resultOConner).toBeGreaterThanOrEqual(85);
		expect(resultOConner).toBeLessThanOrEqual(90);
		expect(resultWathan).toBeGreaterThanOrEqual(85);
		expect(resultWathan).toBeLessThanOrEqual(90);
	});

	it("[ MILITARY ] calculate 1RM correctly for 5 reps at RPE 8", () => {
		const weight = 70;
		const reps = 5;
		const rpe = 8;
		const resultEpley = calculateE1RM(weight, reps, rpe, "epley");
		const resultLander = calculateE1RM(weight, reps, rpe, "lander");
		const resultLombardi = calculateE1RM(weight, reps, rpe, "lombardi");
		const resultMayhew = calculateE1RM(weight, reps, rpe, "mayhew");
		const resultWathan = calculateE1RM(weight, reps, rpe, "wathan");

		expect(resultEpley).toBeGreaterThanOrEqual(85);
		expect(resultEpley).toBeLessThanOrEqual(90);
		expect(resultLander).toBeGreaterThanOrEqual(84);
		expect(resultLander).toBeLessThanOrEqual(90);
		expect(resultLombardi).toBeGreaterThanOrEqual(85);
		expect(resultLombardi).toBeLessThanOrEqual(90);
		expect(resultMayhew).toBeGreaterThanOrEqual(85);
		expect(resultMayhew).toBeLessThanOrEqual(90);
		expect(resultWathan).toBeGreaterThanOrEqual(85);
		expect(resultWathan).toBeLessThanOrEqual(90);
	});

	it("[ MILITARY ] calculate 1RM correctly for 11 reps at RPE 10", () => {
		const weight = 60;
		const reps = 12;
		const rpe = 9.5;
		const resultBrzycki = calculateE1RM(weight, reps, rpe, "brzycki");
		const resultLander = calculateE1RM(weight, reps, rpe, "lander");
		const resultWathan = calculateE1RM(weight, reps, rpe, "wathan");

		expect(resultBrzycki).toBeGreaterThanOrEqual(85);
		expect(resultBrzycki).toBeLessThanOrEqual(90);
		expect(resultLander).toBeGreaterThanOrEqual(85);
		expect(resultLander).toBeLessThanOrEqual(90);
		expect(resultWathan).toBeGreaterThanOrEqual(85);
		expect(resultWathan).toBeLessThanOrEqual(90);
	});
});
