import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { round } from "@/lib/utils";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { Exercise, useExerciseStore } from "@/zustand/exercise-store.ts";

interface Props {
	e1rm: number;
	selectedExercise: Exercise;
}

export function E1rmRow({ e1rm, selectedExercise }: Props) {
	// Calculator store
	const calculatorStore = useCalculatorStore();

	// Exercise store
	const exerciseStore = useExerciseStore();
	const currentExercise = exerciseStore.findExercise(selectedExercise.id);

	if (!currentExercise) return null;

	return (
		<div>
			<Label htmlFor="e1rm" className="mb-1 text-xs font-semibold">
				E1RM
			</Label>
			<div className="flex items-stretch justify-between space-x-1">
				<Input
					id="e1rm"
					className="flex-1"
					type="number"
					value={round(e1rm)}
					onChange={(e) => {
						const value = parseFloat(e.target.value);
						calculatorStore.setE1rm(value);
					}}
				/>
				<Button
					variant={"secondary"}
					onClick={() => {
						calculatorStore.setE1rm(calculatorStore.e1rm - currentExercise.e1rm * 0.05);
					}}
				>
					- 5%
				</Button>
				<Button
					variant={"secondary"}
					onClick={() => {
						calculatorStore.setE1rm(calculatorStore.e1rm - currentExercise.e1rm * 0.01);
					}}
				>
					- 1%
				</Button>
				<Button
					variant={"secondary"}
					onClick={() => {
						calculatorStore.setE1rm(calculatorStore.e1rm + currentExercise.e1rm * 0.01);
					}}
				>
					+ 1%
				</Button>
				<Button
					variant={"secondary"}
					onClick={() => {
						calculatorStore.setE1rm(calculatorStore.e1rm + currentExercise.e1rm * 0.05);
					}}
				>
					+ 5%
				</Button>
			</div>
		</div>
	);
}
