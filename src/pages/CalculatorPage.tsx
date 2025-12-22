import { useEffect, useState } from "react";

import { E1rmRow } from "@/components/e1rm/E1rmRow";
import ExerciseRow from "@/components/exercise/ExerciseRow";
import { HeaderWithMenu } from "@/components/header/HeaderWithMenu";
import { TableHistory } from "@/components/history/TableHistory";
import { ButtonGroupRpe } from "@/components/rpe/ButtonGroupRpe";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { adjustToWeightIncrement, generateRandomId, round } from "@/lib/utils";
import { calculateE1RM } from "@/lib/utils/rmCalculator";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { Exercise, useExerciseStore } from "@/zustand/exercise-store.ts";
import { useHistoryStore } from "@/zustand/history-store.ts";
import { useMeasurementStore } from "@/zustand/measurement-store.ts";
import { useUiStore } from "@/zustand/ui-store.ts";

import { AdjustE1rmModal } from "@/components/e1rm/AdjustE1rmModal";
import "@/globals.css";

function CalculatorPage() {
	// UI store TODO: Improve this
	const uiStore = useUiStore();
	useEffect(() => {
		uiStore.setActivePage("calculator");
	}, []);

	// Calculator store
	const calculatorStore = useCalculatorStore();
	const { selectedExercise, e1rm, reps, targetRpe, weight, rpe } = calculatorStore;

	// Exercise store
	const exerciseStore = useExerciseStore();

	// Measurement store
	const measurementStore = useMeasurementStore();

	// History store
	const historyStore = useHistoryStore();

	// Weight input state
	const [manualWeightInputActive, setManualWeightInputActive] = useState(false);

	// Show dialog for updating E1RM
	const [adjustE1rmModalOpen, setAdjustE1rmModalOpen] = useState(false);
	const [adjustE1rmModelData, setAdjustE1rmModelData] = useState({ oldE1rm: 0, newE1rm: 0 });

	function finishSet(selectedExercise: Exercise) {
		setManualWeightInputActive(false);
		// Update E1RM for exercise
		exerciseStore.updateE1rm(selectedExercise.id, e1rm);

		const oldE1rm = e1rm;
		// Calculate new E1RM
		let bodyweightPartial = 0;
		const bodyweightMeasurement = measurementStore.findMeasurement("1");
		if (bodyweightMeasurement && bodyweightMeasurement.entries.length > 0) {
			const lastEntry = bodyweightMeasurement.entries[bodyweightMeasurement.entries.length - 1];
			const lastBodyweight = lastEntry?.value || 0;
			bodyweightPartial = lastBodyweight * (selectedExercise.bodyweightPercentage / 100) || 0;
		}
		const adjustedWeight = manualWeightInputActive
			? weight
			: adjustToWeightIncrement(weight, selectedExercise.minWeightIncrement);
		const newE1rm = calculateE1RM(adjustedWeight + bodyweightPartial, reps, rpe, "brzycki") - bodyweightPartial;

		console.log("Set Finished", { adjustedWeight: adjustedWeight, reps, rpe, newE1rm, oldE1rm, bodyweightPartial });

		if (!newE1rm || !reps || !rpe) return;
		// Create history entry
		historyStore.createHistoryEntry({
			id: generateRandomId(),
			exerciseId: selectedExercise.id,
			timestamp: new Date().toISOString(),
			reps: reps,
			weight: round(adjustedWeight),
			e1rm: newE1rm,
			rpe: rpe,
		});

		setAdjustE1rmModalOpen(newE1rm > oldE1rm * 1.001 && reps < 9);
		setAdjustE1rmModelData({ oldE1rm, newE1rm });
	}

	return (
		<>
			<HeaderWithMenu />
			<main className="flex flex-col">
				<div className="flex-1">
					<div className="flex flex-col space-y-5 p-5">
						{/* Exercise Row */}
						<div>
							<Label htmlFor="exercise" className="mb-1 text-xs font-semibold">
								Exercise
							</Label>
							<ExerciseRow
								onExerciseSelectionChange={() => {
									setManualWeightInputActive(false);
								}}
							/>
						</div>
						{selectedExercise ? (
							<>
								{/* E1RM Row */}
								<E1rmRow e1rm={e1rm} selectedExercise={selectedExercise} />
								{/* REPS */}
								<div>
									<Label htmlFor="reps" className="mb-1 text-xs font-semibold">
										REPS
									</Label>
									<Input
										id="reps"
										value={reps || ""}
										type="number"
										onChange={(e) => {
											setManualWeightInputActive(false);
											// Update reps in store
											const value = parseInt(e.target.value);
											calculatorStore.setReps(value);
										}}
										className="w-full"
									/>
								</div>
								{/* Target RPE */}
								<div>
									<Label htmlFor="targetRpe" className="mb-1 text-xs font-semibold">
										Target RPE
									</Label>
									<ButtonGroupRpe
										value={targetRpe}
										hideFail={true}
										onSelectionChange={(value) => {
											setManualWeightInputActive(false);
											// Update RPE in store
											calculatorStore.setTargetRpe(value);
											calculatorStore.setRpe(value);
										}}
									/>
								</div>
								{/* WEIGHT */}
								<div>
									<Label htmlFor="weight" className="mb-1 text-xs font-semibold">
										Weight
									</Label>
									<Input
										id="weight"
										value={
											manualWeightInputActive
												? weight || ""
												: adjustToWeightIncrement(
														weight,
														selectedExercise.minWeightIncrement,
													) || ""
										}
										type="number"
										onChange={(e) => {
											// Allow user to enter weight manually
											setManualWeightInputActive(true);

											// Update weight in store
											const value = parseFloat(e.target.value);
											calculatorStore.setWeight(value);
										}}
										className="w-full"
									/>
								</div>
								{/* Actual RPE */}
								<div>
									<Label className="mb-1 text-xs font-semibold">Actual RPE</Label>
									<ButtonGroupRpe
										value={rpe}
										onSelectionChange={(value) => {
											// Update RPE in store
											calculatorStore.setRpe(value);
										}}
									/>
								</div>
								{/* FINISH SET */}
								<div className="flex justify-center">
									<Button
										onClick={() => {
											finishSet(selectedExercise);
										}}
										className="flex-1"
									>
										Finish Set
									</Button>
								</div>
							</>
						) : (
							<></>
						)}
					</div>
					{/* History */}
					{selectedExercise ? (
						<div className="bg-light mb-5 w-full flex-col space-y-5">
							<TableHistory exerciseId={selectedExercise.id} />
						</div>
					) : (
						<></>
					)}
				</div>
				<AdjustE1rmModal
					open={adjustE1rmModalOpen}
					setOpen={setAdjustE1rmModalOpen}
					data={adjustE1rmModelData}
				/>
			</main>
		</>
	);
}

export default CalculatorPage;
