import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { CreateExerciseModal } from "@/components/exercise/CreateExerciseModal.tsx";
import { HeaderWithMenu } from "@/components/header/HeaderWithMenu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button.tsx";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog.tsx";
import { IconDelete } from "@/components/ui/icon/IconDelete";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { Exercise, useExerciseStore } from "@/zustand/exercise-store.ts";
import { useHistoryStore } from "@/zustand/history-store.ts";
import { useUiStore } from "@/zustand/ui-store.ts";

function ExercisesPage() {
	// UI store TODO: Improve this
	const uiStore = useUiStore();
	useEffect(() => {
		uiStore.setActivePage("exercises");
	}, []);

	// Navigation
	const navigate = useNavigate();

	// Exercise store
	const exerciseStore = useExerciseStore();

	// Calculator store
	const calculatorStore = useCalculatorStore();

	// History store
	const historyStore = useHistoryStore();

	// Delete dialog state
	const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

	// Create exercise dialog state
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<HeaderWithMenu />
			<main className="flex min-h-screen flex-col p-5">
				<AlertDialog>
					<h1 className="mb-5 text-2xl font-bold">Exercises</h1>
					{exerciseStore.exercises.map((exercise) => {
						return (
							<div key={exercise.id} className="flex cursor-pointer py-3">
								<a className="flex-1" onClick={() => navigate(`/exercises/${exercise.id}`)}>
									<div>{exercise.name}</div>
								</a>
								<AlertDialogTrigger asChild>
									<a
										onClick={() => {
											setSelectedExercise(exercise);
										}}
									>
										<IconDelete className={"text-red-600"} />
									</a>
								</AlertDialogTrigger>
							</div>
						);
					})}

					<div className={"fixed bottom-5 left-5 right-5 z-50 flex w-auto justify-center"}>
						<Dialog open={isOpen} onOpenChange={setIsOpen}>
							<DialogTrigger asChild>
								<Button
									variant="default"
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

					<AlertDialogContent>
						<AlertDialogHeader>
							Are you sure you want to delete &quot;{selectedExercise?.name}&quot;?
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete your exercise.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 hover:bg-red-700"
								onClick={() => {
									if (!selectedExercise) return;
									exerciseStore.removeExercise(selectedExercise.id);
									historyStore.removeHistoryEntriesByExerciseId(selectedExercise.id);
									if (calculatorStore.selectedExercise?.id === selectedExercise.id) {
										calculatorStore.setSelectedExercise(undefined);
									}
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</main>
		</>
	);
}

export default ExercisesPage;
