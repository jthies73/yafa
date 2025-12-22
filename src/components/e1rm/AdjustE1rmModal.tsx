import { round } from "@/lib/utils.ts";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { useExerciseStore } from "@/zustand/exercise-store.ts";

import { Button } from "@/components/ui/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";

interface Props {
	open: boolean;
	setOpen: (open: boolean) => void;
	data: { oldE1rm: number; newE1rm: number };
}

export function AdjustE1rmModal({ open, setOpen, data }: Props) {
	// Stores
	const exerciseStore = useExerciseStore();
	const calculatorStore = useCalculatorStore();

	function adjustByOnePercent() {
		const newE1rm = data.oldE1rm * 1.01;
		const exercise = calculatorStore.selectedExercise;
		if (!exercise) return;

		calculatorStore.setE1rm(newE1rm);
		exerciseStore.updateE1rm(exercise.id, newE1rm);
		setOpen(false);
	}

	function updateE1rm() {
		const exercise = calculatorStore.selectedExercise;
		if (!exercise) return;

		calculatorStore.setE1rm(data.newE1rm);
		exerciseStore.updateE1rm(exercise.id, data.newE1rm);
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Your E1RM has increased!</DialogTitle>
					<DialogDescription>Would you like to adjust your E1RM?</DialogDescription>
				</DialogHeader>

				<div>
					<span className="text-2xl font-bold">{round(data.oldE1rm)} kg</span>
					<span className="m-5 text-2xl font-bold">→</span>
					<span className="text-2xl font-bold">{round(data.newE1rm)} kg</span>
				</div>

				<DialogFooter className="gap-1">
					<Button onClick={() => adjustByOnePercent()} variant="outline">
						+ 1%
					</Button>
					<Button onClick={() => updateE1rm()}>Update E1RM</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
