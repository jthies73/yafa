import { round } from "@/lib/utils";

interface Algorithm {
	average: undefined;
	epley: undefined;
	brzycki: undefined;
	lander: undefined;
	lombardi: undefined;
	mayhew: undefined;
	o_conner: undefined;
	wathan: undefined;
}

export function calculateE1RM(weight: number, reps: number, rpe: number, formula: keyof Algorithm) {
	return calculateMaxWeightForTargetReps(reps, weight, rpe, 1, 10, formula);
}

export function calculateMaxWeightForTargetReps(
	reps: number,
	weight: number,
	rpe: number,
	targetReps: number,
	targetRpe: number,
	formula: keyof Algorithm,
) {
	// calculate actual possible reps based on RPE
	reps = reps + (10 - rpe);

	// calculate actual targetReps based on targetRPE
	targetReps = targetReps + (10 - targetRpe);

	if (formula === "average") {
		const epley = calc1rm["epley"](weight, reps);
		const brzycki = calc1rm["brzycki"](weight, reps);
		const lander = calc1rm["lander"](weight, reps);
		const lombardi = calc1rm["lombardi"](weight, reps);
		const mayhew = calc1rm["mayhew"](weight, reps);
		const o_conner = calc1rm["o_conner"](weight, reps);
		const wathan = calc1rm["wathan"](weight, reps);
		if (targetReps === 1) {
			return round((epley + brzycki + lander + lombardi + mayhew + o_conner + wathan) / 7);
		} else {
			const x_epley = calcXrm["epley"](epley, targetReps);
			const x_brzycki = calcXrm["brzycki"](brzycki, targetReps);
			const x_lander = calcXrm["lander"](lander, targetReps);
			const x_lombardi = calcXrm["lombardi"](lombardi, targetReps);
			const x_mayhew = calcXrm["mayhew"](mayhew, targetReps);
			const x_o_conner = calcXrm["o_conner"](o_conner, targetReps);
			const x_wathan = calcXrm["wathan"](wathan, targetReps);
			return round((x_epley + x_brzycki + x_lander + x_lombardi + x_mayhew + x_o_conner + x_wathan) / 7);
		}
	} else {
		const oneRM = calc1rm[formula](weight, reps);
		if (targetReps === 1) {
			return round(oneRM);
		} else {
			return round(calcXrm[formula](oneRM, targetReps));
		}
	}
}

const calc1rm = {
	epley: (weight: number, reps: number) => weight * (1 + reps / 30),
	brzycki: (weight: number, reps: number) => weight * (36 / (37 - reps)),
	lander: (weight: number, reps: number) => (weight * 100) / (101.3 - 2.67123 * reps),
	lombardi: (weight: number, reps: number) => weight * Math.pow(reps, 1 / 10),
	mayhew: (weight: number, reps: number) => (weight * 100) / (52.2 + 41.9 * Math.exp(-1 * (reps * 0.055))),
	o_conner: (weight: number, reps: number) => weight * (1 + reps * 0.025),
	wathan: (weight: number, reps: number) => (weight * 100) / (48.8 + 53.8 * Math.exp(-1 * (reps * 0.075))),
} as const;

const calcXrm = {
	epley: (oneRM: number, reps: number) => oneRM / (1 + reps / 30),
	brzycki: (oneRM: number, reps: number) => (oneRM * (37 - reps)) / 36,
	lander: (oneRM: number, reps: number) => (oneRM * (101.3 - 2.67123 * reps)) / 100,
	lombardi: (oneRM: number, reps: number) => oneRM / Math.pow(reps, 1 / 10),
	mayhew: (oneRM: number, reps: number) => (oneRM * (52.2 + 41.9 * Math.exp(-1 * (reps * 0.055)))) / 100,
	o_conner: (oneRM: number, reps: number) => oneRM / (1 + reps * 0.025),
	wathan: (oneRM: number, reps: number) => (oneRM * (48.8 + 53.8 * Math.exp(-1 * (reps * 0.075)))) / 100,
} as const;
