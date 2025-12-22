import { useState } from "react";

import { CreateExerciseModal } from "@/components/exercise/CreateExerciseModal.tsx";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/Select.tsx";
import { useToast } from "@/components/ui/toast/use-toast.ts";

import { generateRandomId, round } from "@/lib/utils.ts";
import { calculateE1RM } from "@/lib/utils/rmCalculator.ts";

import { Exercise, useExerciseStore } from "@/zustand/exercise-store.ts";
import { HistoryEntry, useHistoryStore } from "@/zustand/history-store.ts";
import { useMeasurementStore } from "@/zustand/measurement-store.ts";

interface Props {
	onClose: () => void;
}

export function CreateHistoryEntryModal({ onClose }: Props) {
	// Toast
	const { toast } = useToast();

	// Exercise store
	const exerciseStore = useExerciseStore();
	const exercises = exerciseStore.exercises;

	// Measurement store
	const measurementStore = useMeasurementStore();

	// History store
	const historyStore = useHistoryStore();

	// Modal state
	const [selectedExercise, setSelectedExercise] = useState<Exercise>();
	const [date, setDate] = useState<string>(new Date().toISOString());
	const [reps, setReps] = useState<number>();
	const [weight, setWeight] = useState<number>();
	const [weightInput, setWeightInput] = useState<string>("");
	const [rpe, setRpe] = useState<number>();

	// Create Exercise Modal state
	const [isOpen, setIsOpen] = useState(false);

	function validForm() {
		if (!selectedExercise) {
			toast({
				variant: "destructive",
				title: "No Exercise Selected",
				description: "Please select an exercise",
			});
			return false;
		}

		if (!date) {
			toast({
				variant: "destructive",
				title: "No Date Selected",
				description: "Please select a date",
			});
			return false;
		}

		if (!reps) {
			toast({
				variant: "destructive",
				title: "No Reps Entered",
				description: "Please enter the number of reps",
			});
			return false;
		}

		if (!weight) {
			toast({
				variant: "destructive",
				title: "No Weight Entered",
				description: "Please enter the weight",
			});
			return false;
		}

		if (!rpe) {
			toast({
				variant: "destructive",
				title: "No RPE Entered",
				description: "Please enter the RPE",
			});
			return false;
		}

		if (rpe < 0 || rpe > 10) {
			toast({
				variant: "destructive",
				title: "Invalid RPE",
				description: "RPE must be between 0 and 10",
			});
			return false;
		}

		return true;
	}

	function createHistoryEntry() {
		if (!validForm()) return;
		if (!selectedExercise || !date || !reps || !weight || !rpe) return;

		// Calculate E1RM
		let bodyweightPartial = 0;
		const bodyweightMeasurement = measurementStore.findMeasurement("1");
		if (bodyweightMeasurement && bodyweightMeasurement.entries.length > 0) {
			const lastEntry = bodyweightMeasurement.entries[bodyweightMeasurement.entries.length - 1];
			const lastBodyweight = lastEntry?.value || 0;
			bodyweightPartial = lastBodyweight * (selectedExercise.bodyweightPercentage / 100) || 0;
		}
		const e1rm = calculateE1RM(weight + bodyweightPartial, reps, rpe, "brzycki") - bodyweightPartial;

		const historyEntry: HistoryEntry = {
			id: generateRandomId(),
			exerciseId: selectedExercise.id,
			timestamp: new Date(date).toISOString(),
			reps: reps,
			weight: round(weight),
			rpe: rpe,
			e1rm: rpe > 7 && reps < 9 ? e1rm : NaN,
		};

		// Save history entry
		historyStore.createHistoryEntry(historyEntry);
		return onClose();
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Create new History Entry</DialogTitle>
			</DialogHeader>
			<form
				className="flex flex-col space-y-5"
				onSubmit={(e) => {
					e.preventDefault();
					createHistoryEntry();
				}}
			>
				{/* Exercise */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">Exercise Name</h1>
					<div className={"flex space-x-1"}>
						<Select
							onValueChange={(exerciseId) => {
								const selectedExercise = exerciseStore.findExercise(exerciseId);
								setSelectedExercise(selectedExercise);
							}}
							value={selectedExercise && selectedExercise.id}
						>
							<SelectTrigger disabled={exercises.length === 0} className="w-[180px]">
								<SelectValue placeholder={exercises.length > 0 ? "Select Exercise" : "No Exercises"} />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>
										{exercises.length > 0 ? "Select Exercise" : "No Exercises"}
									</SelectLabel>
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
						{exerciseStore.exercises.length == 0 && (
							<Dialog open={isOpen} onOpenChange={setIsOpen}>
								<DialogTrigger asChild>
									<Button
										className="w-full"
										onClick={() => {
											setIsOpen(true);
										}}
									>
										Create Exercise
									</Button>
								</DialogTrigger>
								<CreateExerciseModal onClose={() => setIsOpen(false)} />
							</Dialog>
						)}
					</div>
				</div>
				{/* Date */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">Date</h1>
					<Input
						value={date}
						type="date"
						onChange={(e) => {
							setDate(e.target.value);
						}}
					/>
				</div>
				{/* Reps */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">Reps</h1>
					<Input
						value={reps}
						type="number"
						onChange={(e) => {
							const value = parseFloat(e.target.value);
							setReps(value);
						}}
					/>
				</div>
				{/* Weight */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">Weight (kg)</h1>
					<Input
						value={weightInput}
						onChange={(e) => {
							setWeightInput(e.target.value);
							const value = parseFloat(e.target.value);
							if (!isNaN(value)) {
								setWeight(value);
							}
						}}
					/>
				</div>
				{/* RPE */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">RPE</h1>
					<Input
						value={rpe}
						type="number"
						onChange={(e) => {
							const value = parseFloat(e.target.value);
							setRpe(value);
						}}
					/>
				</div>
				<DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
