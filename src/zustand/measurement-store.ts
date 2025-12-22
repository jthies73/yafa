import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MeasurementEntry {
	id: string;
	timestamp: string;
	value: number;
}

export interface Measurement {
	id: string;
	name: string;
	unit: string;
	entries: MeasurementEntry[];
}

// Define the store state and actions
interface MeasurementStore {
	measurements: Measurement[];
	setMeasurements: (measurements: Measurement[]) => void;
	findMeasurement: (id: string) => Measurement | undefined;
	addMeasurementEntry: (measurementId: string, entry: MeasurementEntry) => void;
	deleteMeasurementEntry: (measurementId: string, entryId: string) => void;
	createMeasurement: (measurement: Measurement) => void;
	deleteMeasurement: (measurementId: string) => void;
}

// Create the Zustand store
const useMeasurementStore = create<MeasurementStore>()(
	persist(
		(set, get) => ({
			measurements: [{ id: "1", name: "Bodyweight", unit: "kg", entries: [] }],
			setMeasurements: (measurements: Measurement[]) => {
				set({ measurements });
				console.log("Measurements replaced", measurements);
			},
			findMeasurement: (id: string) => {
				return get().measurements.find((m) => m.id === id);
			},
			addMeasurementEntry: (measurementId: string, entry: MeasurementEntry) => {
				set((state) => {
					const measurement = state.measurements.find((m) => m.id === measurementId);
					if (!measurement) return state;

					measurement.entries.push(entry);
					return { measurements: state.measurements };
				});
				console.log("Measurement entry added", { measurementId, entry });
			},
			deleteMeasurementEntry: (measurementId: string, entryId: string) => {
				set((state) => {
					const measurement = state.measurements.find((m) => m.id === measurementId);
					if (!measurement) return state;

					measurement.entries = measurement.entries.filter((e) => e.id !== entryId);
					return { measurements: state.measurements };
				});
				console.log("Measurement entry deleted", { measurementId, entryId });
			},
			createMeasurement: (measurement: Measurement) => {
				set((state) => {
					state.measurements.push(measurement);
					return { measurements: state.measurements };
				});
				console.log("Measurement created", measurement);
			},
			deleteMeasurement: (measurementId: string) => {
				set((state) => {
					const measurements = state.measurements.filter((m) => m.id !== measurementId);
					return { measurements };
				});
				console.log("Measurement deleted", measurementId);
			},
		}),
		{
			name: "measurement-storage",
		},
	),
);

export { useMeasurementStore };
