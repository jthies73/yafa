import { create } from "zustand";
import { persist } from "zustand/middleware";

import { round } from "@/lib/utils";
import { calculateMaxWeightForTargetReps } from "@/lib/utils/rmCalculator";

import { Exercise } from "@/zustand/exercise-store.ts";

// Define the store state and actions
interface CalculatorStore {
	selectedExercise?: Exercise;
	setSelectedExercise: (exercise: Exercise | undefined) => void;
	bodyweight?: number;
	setBodyweight: (bodyweight: number) => void;
	e1rm: number;
	setE1rm: (e1rm: number) => void;
	targetRpe: 3 | 6 | 7 | 8 | 8.5 | 9 | 9.5 | 10 | 11;
	setTargetRpe: (rpe: 3 | 6 | 7 | 8 | 8.5 | 9 | 9.5 | 10 | 11) => void;
	rpe: 3 | 6 | 7 | 8 | 8.5 | 9 | 9.5 | 10 | 11;
	setRpe: (rpe: 3 | 6 | 7 | 8 | 8.5 | 9 | 9.5 | 10 | 11) => void;
	reps: number;
	setReps: (reps: number) => void;
	weight: number;
	setWeight: (weight: number) => void;

	calculateTargetWeight: () => void;

	calculateTargetRpe: () => void;

	clearRepsAndWeight: () => void;
}

// Create the Zustand store
const useCalculatorStore = create<CalculatorStore>()(
	persist(
		(set, get) => ({
			selectedExercise: undefined,
			setSelectedExercise: (exercise) => {
				set((state) => ({
					...state,
					selectedExercise: exercise,
				}));
				console.log("Exercise selected", { exercise });
				get().calculateTargetWeight();
			},
			bodyweight: 0,
			setBodyweight: (bodyweight) => {
				set((state) => ({
					...state,
					bodyweight: bodyweight,
				}));
				console.log("Bodyweight updated (Calculator)", { bodyweight });
				get().calculateTargetWeight();
			},
			e1rm: 0,
			setE1rm: (e1rm) => {
				const roundedE1rm = round(e1rm);
				set((state) => ({
					...state,
					e1rm: roundedE1rm,
				}));
				console.log("E1RM updated (Calculator)", { e1rm: roundedE1rm });
				get().calculateTargetWeight();
			},
			reps: 0,
			setReps: (reps) => {
				set((state) => ({
					...state,
					reps: reps,
				}));
				console.log("Reps updated", { reps });
				get().calculateTargetRpe();
				get().calculateTargetWeight();
			},
			weight: 0,
			setWeight: (weight) => {
				const roundedWeight = round(weight);
				set((state) => ({
					...state,
					weight: roundedWeight,
				}));
				console.log("Weight updated", { weight: roundedWeight });
			},
			targetRpe: 8,
			setTargetRpe: (rpe) => {
				set((state) => ({
					...state,
					targetRpe: rpe,
				}));
				console.log("Target RPE updated", { rpe });
				get().calculateTargetWeight();
			},
			rpe: 8,
			setRpe: (rpe) => {
				set((state) => ({
					...state,
					rpe: rpe,
				}));
				console.log("Actual RPE updated", { rpe });
			},
			calculateTargetWeight: () => {
				const { e1rm, reps, targetRpe, bodyweight = 0, selectedExercise } = get();

				if (e1rm === 0 || reps === 0 || !selectedExercise) return;

				if (reps >= 15) return set((state) => ({ ...state, weight: e1rm * 0.4 }));
				const bodyweightPartial = bodyweight * (selectedExercise.bodyweightPercentage / 100) || 0;
				const targetWeight =
					calculateMaxWeightForTargetReps(1, e1rm + bodyweightPartial, 10, reps, targetRpe, "brzycki") -
					bodyweightPartial;

				console.log("Target weight calculated", { e1rm, reps, targetRpe, targetWeight });
				set((state) => ({
					...state,
					weight: targetWeight,
				}));
			},
			calculateTargetRpe: () => {
				const reps = get().reps;
				if (reps === 0) return;
				else if (reps >= 7) {
					set((state) => ({
						...state,
						targetRpe: 10,
						rpe: 10,
					}));
				} else if (reps <= 4) {
					set((state) => ({
						...state,
						targetRpe: 7,
						rpe: 7,
					}));
				} else if (reps === 5) {
					set((state) => ({
						...state,
						targetRpe: 8,
						rpe: 8,
					}));
				} else if (reps === 6) {
					set((state) => ({
						...state,
						targetRpe: 9,
						rpe: 9,
					}));
				}
				console.log("Target RPE calculated", { reps, targetRpe: get().targetRpe, rpe: get().rpe });
			},
			clearRepsAndWeight: () => {
				set((state) => ({
					...state,
					reps: 0,
					weight: 0,
				}));
				console.log("Calculator cleared");
			},
		}),
		{
			name: "calculator-storage",
		},
	),
);

export { useCalculatorStore };
