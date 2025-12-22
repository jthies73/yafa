import { useEffect, useState } from "react";

import { HeaderWithMenu } from "@/components/header/HeaderWithMenu";
import { CreateHistoryEntryModal } from "@/components/history/CreateHistoryEntryModal.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog.tsx";

import { round } from "@/lib/utils.ts";

import { useExerciseStore } from "@/zustand/exercise-store.ts";
import { useHistoryStore } from "@/zustand/history-store.ts";
import { useUiStore } from "@/zustand/ui-store.ts";

interface CompactExercise {
	exerciseId: string;
	exerciseName: string;
	sets: number;
	bestSet: string;
	e1rm: number;
}

interface Day {
	date: string;
	compactExercises: CompactExercise[];
}

function HistoryPage() {
	// UI store TODO: Improve this
	const uiStore = useUiStore();
	useEffect(() => {
		uiStore.setActivePage("history");
	}, []);

	// Exercise store
	const exerciseStore = useExerciseStore();

	// History store
	const historyStore = useHistoryStore();
	const days = historyStore.findHistoryEntriesGroupedByDay().reduce((acc: Day[], d) => {
		const entries = d.entries;
		const compactExercises = entries.reduce((acc: CompactExercise[], entry) => {
			const exercise = acc.find((ce) => ce.exerciseId == entry.exerciseId);
			if (exercise) {
				// update e1rm if current set is better set
				if (entry.e1rm > exercise.e1rm || !exercise.e1rm) {
					exercise.e1rm = entry.e1rm;
					exercise.bestSet = `${entry.reps} x ${entry.weight} kg @ ${entry.rpe < 6 ? "<6" : entry.rpe}`;
				}
			} else {
				acc.push({
					exerciseId: entry.exerciseId,
					exerciseName: exerciseStore.findExercise(entry.exerciseId)?.name || "N/A",
					bestSet: `${entry.reps} x ${entry.weight} kg @ ${entry.rpe < 6 ? "<6" : entry.rpe}`,
					e1rm: entry.e1rm,
					sets: entries.filter((e) => e.exerciseId == entry.exerciseId).length,
				});
			}
			return acc;
		}, []);

		acc.push({
			date: d.date,
			compactExercises: compactExercises,
		});
		return acc;
	}, []);

	// Create exercise dialog state
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<HeaderWithMenu />
			<main className="flex min-h-screen flex-col p-5">
				<h1 className="mb-5 text-2xl font-bold">History</h1>

				{[...days].reverse().map((day) => {
					const friendlyDate = new Date(day.date).toLocaleDateString("de-DE", {
						year: "numeric",
						month: "short",
						day: "numeric",
					});
					return (
						<div key={friendlyDate}>
							{/* sticky top-[45px] z-40 */}
							<h2 className="w-full bg-background px-1 py-2 text-lg font-semibold">{friendlyDate}</h2>
							<div className="overflow-x-auto">
								<table className="w-full divide-y divide-gray-200">
									<thead className="w-full">
										{/* sticky top-[89px] z-30 */}
										<tr className="bg-background">
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												Exercise
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												Sets
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												Best Set
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												E1RM
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{day.compactExercises.map((ce) => (
											<tr key={ce.exerciseId}>
												{/* Exercise Name */}
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{ce.exerciseName}
												</td>
												{/* Sets */}
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{ce.sets}
												</td>
												{/* Best Set */}
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{ce.bestSet}
												</td>
												{/* E1RM */}
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{ce.e1rm ? `${round(ce.e1rm)} kg` : "N/A"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
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
								Add Set
							</Button>
						</DialogTrigger>
						<CreateHistoryEntryModal onClose={() => setIsOpen(false)} />
					</Dialog>
				</div>
			</main>
		</>
	);
}

export default HistoryPage;
