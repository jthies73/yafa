import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import { HeaderWithMenu } from "@/components/header/HeaderWithMenu";
import { Button } from "@/components/ui/Button";
import { DialogFooter } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast/use-toast";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { Exercise, useExerciseStore } from "@/zustand/exercise-store.ts";

interface RouteParams extends Record<string, string | undefined> {
	id?: string;
}

export function EditExercisePage() {
	const { toast } = useToast();
	const { id } = useParams<RouteParams>();

	// Navigation
	const navigate = useNavigate();

	// Stores
	const exerciseStore = useExerciseStore();
	const exercise = exerciseStore.findExercise(id + "");

	// Calculator store
	const calculatorStore = useCalculatorStore();

	// Exercise modal state
	const [exerciseName, setExerciseName] = useState(exercise?.name);
	const [e1rm, setE1rm] = useState<number | undefined>(exercise?.e1rm);
	const [minWeightIncrement, setMinWeightIncrement] = useState<number | undefined>(exercise?.minWeightIncrement);
	const [minWeightIncrementInput, setMinWeightIncrementInput] = useState<string>(exercise?.minWeightIncrement + "");
	const [bodyweightPercentage, setBodyweightPercentage] = useState<number | undefined>(
		exercise?.bodyweightPercentage,
	);

	// TODO: Refactor
	if (!id) return;
	if (!exercise) return;

	const updateExercise = () => {
		const updatedExercise: Exercise = {
			id: exercise.id,
			name: exerciseName || exercise.name,
			e1rm: e1rm || exercise.e1rm,
			minWeightIncrement: minWeightIncrement || exercise.minWeightIncrement,
			bodyweightPercentage: bodyweightPercentage || exercise.bodyweightPercentage,
		};
		exerciseStore.updateExercise(exercise.id, updatedExercise);
		if (calculatorStore.selectedExercise?.id === exercise.id) {
			calculatorStore.setSelectedExercise(updatedExercise);
			calculatorStore.setE1rm(updatedExercise.e1rm);
		}
		toast({
			variant: "default",
			title: "Exercise Updated",
			description: "Changes saved.",
		});
		navigate("/exercises");
	};
	return (
		<>
			<HeaderWithMenu />
			<main className="flex min-h-screen flex-col p-5">
				<div className="flex-1">
					<form
						className="flex flex-col space-y-5"
						onSubmit={(e) => {
							e.preventDefault();
							updateExercise();
						}}
					>
						{/* Exercise Name */}
						<div>
							<h1 className="mb-1 text-xs font-semibold">Exercise Name</h1>
							<Input
								value={exerciseName}
								onChange={(e) => {
									setExerciseName(e.target.value);
								}}
							/>
						</div>
						{/* E1RM */}
						<div>
							<h1 className="mb-1 text-xs font-semibold">E1RM (kg)</h1>
							<Input
								value={e1rm}
								type="number"
								onChange={(e) => {
									const value = parseFloat(e.target.value);
									setE1rm(value);
								}}
							/>
						</div>
						{/* MIN WEIGHT INCREMENT */}
						<div>
							<h1 className="mb-1 text-xs font-semibold">Min Weight Increment (kg)</h1>
							<Input
								value={minWeightIncrementInput}
								onChange={(e) => {
									setMinWeightIncrementInput(e.target.value);
									const value = parseFloat(e.target.value);
									if (!isNaN(value)) setMinWeightIncrement(value);
								}}
							/>
						</div>
						{/* Bodyweight Percentage */}
						<div>
							<h1 className="mb-1 text-xs font-semibold">Bodyweight Percentage (%)</h1>
							<Input
								value={bodyweightPercentage}
								type="number"
								onChange={(e) => {
									const value = parseFloat(e.target.value);
									setBodyweightPercentage(value);
								}}
							/>
						</div>
						<DialogFooter>
							<Button type="submit">Save changes</Button>
						</DialogFooter>
					</form>
				</div>
			</main>
		</>
	);
}
