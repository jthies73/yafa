import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Exercise {
	id: string;
	name: string;
	e1rm: number;
	minWeightIncrement: number;
	bodyweightPercentage: number;
}

// Define the store state and actions
interface ExerciseStore {
	exercises: Exercise[];
	setExercises: (exercises: Exercise[]) => void;
	createExercise: (exercise: Exercise) => void;
	removeExercise: (id: string) => void;
	findExercise: (id: string) => Exercise | undefined;
	updateE1rm: (id: string, e1rm: number) => void;
	updateExercise: (id: string, exercise: Exercise) => void;
}

// Create the Zustand store
const useExerciseStore = create<ExerciseStore>()(
	persist(
		(set, get) => ({
			exercises: [],
			setExercises: (exercises) => {
				set({ exercises });
				console.log("Exercises replaced", exercises);
			},
			createExercise: (exercise) => {
				set((state) => ({
					exercises: [...state.exercises, exercise],
				}));
				console.log("Exercise created", exercise);
			},
			removeExercise: (id) => {
				set((state) => ({
					exercises: state.exercises.filter((e) => e.id !== id),
				}));
				console.log("Exercise deleted", id);
			},
			findExercise: (id) => {
				return get().exercises.find((e) => e.id === id);
			},
			updateE1rm: (id, e1rm) => {
				set((state) => ({
					exercises: state.exercises.map((e) => {
						if (e.id === id) {
							return {
								...e,
								e1rm,
							};
						} else {
							return e;
						}
					}),
				}));
				console.log("E1RM updated (Exercise)", { id, e1rm });
			},
			updateExercise: (id, exercise) => {
				set((state) => ({
					exercises: state.exercises.map((e) => {
						if (e.id === id) {
							return exercise;
						} else {
							return e;
						}
					}),
				}));
				console.log("Exercise updated", { id, exercise });
			},
		}),
		{
			name: "exercise-storage",
		},
	),
);

export { useExerciseStore };
