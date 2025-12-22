import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Day {
	date: string;
	entries: HistoryEntry[];
	totalVolume: number;
}

export interface HistoryEntry {
	id: string;
	exerciseId: string;
	timestamp: string;
	reps: number;
	weight: number;
	rpe: number;
	e1rm: number;
}

// Define the store state and actions
interface HistoryStore {
	entries: HistoryEntry[];
	setEntries: (entries: HistoryEntry[]) => void;
	createHistoryEntry: (entry: HistoryEntry) => void;
	removeHistoryEntry: (id: string) => void;
	findHistoryEntriesByExerciseId: (exerciseId: string) => HistoryEntry[];
	findHistoryEntriesGroupedByDay: (exerciseId?: string) => Day[];
	removeHistoryEntriesByExerciseId: (exerciseId: string) => void;
}

// Create the Zustand store
const useHistoryStore = create<HistoryStore>()(
	persist(
		(set, get) => ({
			entries: [],
			setEntries: (entries) => {
				set({ entries });
				console.log("History Entries replaced", entries);
			},
			createHistoryEntry: (entry) => {
				set((state) => ({
					entries: [...state.entries, entry],
				}));
				console.log("History Entry created", entry);
			},
			removeHistoryEntry: (id) => {
				set((state) => ({
					entries: state.entries.filter((e) => e.id !== id),
				}));
				console.log("History Entry deleted", { id });
			},
			findHistoryEntriesByExerciseId: (exerciseId) => {
				return get().entries.filter((e) => e.exerciseId === exerciseId);
			},
			findHistoryEntriesGroupedByDay: (exerciseId) => {
				const entries = exerciseId ? get().entries.filter((e) => e.exerciseId === exerciseId) : get().entries;

				const days = entries.reduce((acc: Day[], entry) => {
					const date = new Date(entry.timestamp).toDateString();
					const day = acc.find((d) => d.date === date);
					if (day) {
						day.entries.push(entry);
						day.totalVolume += entry.reps * entry.weight;
					} else {
						acc.push({
							date,
							entries: [entry],
							totalVolume: entry.reps * entry.weight,
						});
					}
					return acc;
				}, []);

				return days;
			},
			removeHistoryEntriesByExerciseId: (exerciseId) => {
				set((state) => ({
					entries: state.entries.filter((e) => e.exerciseId !== exerciseId),
				}));
				console.log("History Entry deleted", { exerciseId });
			},
		}),
		{
			name: "history-storage",
		},
	),
);

export { useHistoryStore };
