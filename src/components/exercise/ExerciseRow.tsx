import { useState } from "react";

import { CreateExerciseModal } from "@/components/exercise/CreateExerciseModal";
import { Button } from "@/components/ui/Button.tsx";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog.tsx";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/Select";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { useExerciseStore } from "@/zustand/exercise-store.ts";
import { useMeasurementStore } from "@/zustand/measurement-store.ts";

interface Props {
	onExerciseSelectionChange: (value: string) => void;
}

export default function ExerciseRow({ onExerciseSelectionChange: onExerciseSelectionChanged }: Props) {
	// Calculator store
	const calculatorStore = useCalculatorStore();
	const selectedExercise = calculatorStore.selectedExercise;

	// Exercise store
	const exerciseStore = useExerciseStore();
	const exercises = exerciseStore.exercises;

	// Measurment store
	const measurementStore = useMeasurementStore();

	// Exercise modal state
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="flex space-x-1">
			<Select
				onValueChange={(value) => {
					const selectedExercise = exerciseStore.findExercise(value);
					if (!selectedExercise) return;
					// update selected exercise in calculator
					calculatorStore.setSelectedExercise(selectedExercise);
					calculatorStore.setE1rm(selectedExercise.e1rm);
					// update bodyweight in calculator
					const bodyweight = measurementStore.findMeasurement("1");
					if (bodyweight && bodyweight.entries.length > 0) {
						const lastEntry = bodyweight.entries[bodyweight.entries.length - 1];
						const lastBodyweight = lastEntry?.value || 0;
						calculatorStore.setBodyweight(lastBodyweight);
					}
					onExerciseSelectionChanged(value);
				}}
				value={selectedExercise && selectedExercise.id}
			>
				<SelectTrigger disabled={exercises.length === 0} className="w-[180px]">
					<SelectValue placeholder={exercises.length > 0 ? "Select Exercise" : "No Exercises"} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>{exercises.length > 0 ? "Select Exercise" : "No Exercises"}</SelectLabel>
						{exercises.map((exercise) => {
							return (
								<SelectItem key={exercise.id} value={exercise.id}>
									{exercise.name}
								</SelectItem>
							);
						})}
					</SelectGroup>
				</SelectContent>
			</Select>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button
						className="w-full"
						onClick={() => {
							setIsOpen(true);
						}}
					>
						{exerciseStore.exercises.length > 0 ? "Add Exercise" : "Create Exercise"}
					</Button>
				</DialogTrigger>
				<CreateExerciseModal onClose={() => setIsOpen(false)} />
			</Dialog>
		</div>
	);
}
