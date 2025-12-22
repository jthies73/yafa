import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast/use-toast";

import { generateRandomId } from "@/lib/utils";
import { calculateE1RM } from "@/lib/utils/rmCalculator";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { Exercise, useExerciseStore } from "@/zustand/exercise-store.ts";

const DEFAULT_WEIGHT_INCREMENT = 2.5;

interface Props {
	onClose: () => void;
}

export function CreateExerciseModal({ onClose }: Props) {
	// Stores
	const exerciseStore = useExerciseStore();
	const calculatorStore = useCalculatorStore();

	// Exercise modal state
	const [exerciseName, setExerciseName] = useState("");
	const [initialE1RM, setInitialE1RM] = useState<number | undefined>();
	const [reps, setReps] = useState<number | undefined>();
	const [weight, setWeight] = useState<number | undefined>();
	const [minWeightIncrement, setMinWeightIncrement] = useState<number | undefined>();
	const [bodyweightPercentage, setBodyweightPercentage] = useState<number | undefined>();

	useEffect(() => {
		return () => {
			setExerciseName("");
			setInitialE1RM(undefined);
			setReps(undefined);
			setWeight(undefined);
			setMinWeightIncrement(undefined);
			setBodyweightPercentage(undefined);
			console.log("Dialog cleared");
		};
	}, []);

	const { toast } = useToast();

	function createExercise() {
		// Show alert dialog if name is empty
		if (exerciseName === "") {
			return toast({
				variant: "destructive",
				title: "Exercise Name is required",
				description: "Please enter an name",
			});
		}

		// Show alert dialog if initial E1RM is empty and reps and weight are empty
		if (!initialE1RM && !(reps && weight)) {
			return toast({
				variant: "destructive",
				title: "Initial E1RM is required",
				description: "Please enter either an E1RM or Reps and Weight that you can lift for this exercise",
			});
		}

		// Calculate E1RM
		let e1rm: number = 0;
		if (reps && weight) {
			e1rm = calculateE1RM(weight, reps, 10, "brzycki");
		} else if (initialE1RM) {
			e1rm = initialE1RM;
		}

		if (!e1rm) return;

		const exercise: Exercise = {
			id: generateRandomId(),
			name: exerciseName,
			e1rm: e1rm,
			minWeightIncrement: minWeightIncrement || DEFAULT_WEIGHT_INCREMENT,
			bodyweightPercentage: bodyweightPercentage || 0,
		};
		exerciseStore.createExercise(exercise);
		calculatorStore.setSelectedExercise(exercise);
		calculatorStore.setE1rm(exercise.e1rm);
		calculatorStore.clearRepsAndWeight();
		return onClose();
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Create new Exercise</DialogTitle>
			</DialogHeader>
			<form
				className="flex flex-col space-y-5"
				onSubmit={(e) => {
					e.preventDefault();
					createExercise();
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
				<div className="flex items-end justify-center space-x-1">
					{/* E1RM */}
					<div>
						<h1 className="mb-1 text-xs font-semibold">E1RM (kg)</h1>
						<Input
							value={initialE1RM}
							type="number"
							onChange={(e) => {
								const value = parseFloat(e.target.value);
								setInitialE1RM(value);
							}}
						/>
					</div>
					<span className="flex h-10 items-center justify-center px-3">||</span>
					<div className="flex items-end justify-center space-x-1">
						{/* Reps */}
						<div>
							<h1 className="mb-1 text-xs font-semibold">Reps</h1>
							<Input
								value={reps}
								placeholder={"Reps"}
								type="number"
								onChange={(e) => {
									const value = parseFloat(e.target.value);
									setReps(value);
								}}
							/>
						</div>
						<span className="flex h-10 items-center justify-center px-3">&&</span>
						{/* WEIGHT */}
						<div>
							<h1 className="mb-1 text-xs font-semibold">Weight (kg)</h1>
							<Input
								value={weight}
								placeholder={"Weight"}
								type="number"
								onChange={(e) => {
									const value = parseFloat(e.target.value);
									setWeight(value);
								}}
							/>
						</div>
					</div>
				</div>
				{/* MIN WEIGHT INCREMENT */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">Min Weight Increment (kg)</h1>
					<Input
						value={minWeightIncrement}
						placeholder={DEFAULT_WEIGHT_INCREMENT.toString()}
						type="number"
						onChange={(e) => {
							const value = parseFloat(e.target.value);
							setMinWeightIncrement(value);
						}}
					/>
				</div>
				{/* Bodyweight Percentage */}
				<div>
					<h1 className="mb-1 text-xs font-semibold">Bodyweight Percentage (%)</h1>
					<Input
						value={bodyweightPercentage}
						placeholder={"0"}
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
		</DialogContent>
	);
}
