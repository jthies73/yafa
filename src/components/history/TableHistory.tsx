import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { IconDelete } from "@/components/ui/icon/IconDelete";

import { round } from "@/lib/utils";

import { HistoryEntry, useHistoryStore } from "@/zustand/history-store.ts";

interface Props {
	exerciseId: string;
}

export function TableHistory({ exerciseId }: Props) {
	const historyStore = useHistoryStore();
	const days = historyStore.findHistoryEntriesGroupedByDay(exerciseId);

	const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

	// Maybe add empty state here
	if (days.length === 0) return null;
	return (
		<div className="w-full">
			<AlertDialog>
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
												Set
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												Time
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												Volume
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												RPE
											</th>
											<th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">
												E1RM
											</th>
											<th></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{day.entries.reverse().map((entry, index) => (
											<tr key={entry.id} onClick={() => setSelectedEntry(entry)}>
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm font-medium">
													{day.entries.length - index}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{new Date(entry.timestamp).toLocaleTimeString("en-EN", {
														hour: "numeric",
														minute: "numeric",
														hour12: true,
													})}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{entry.reps} × {round(entry.weight)} kg
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{entry.rpe > 3 ? `${entry.rpe}` : "< 6"}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-center text-sm">
													{entry.e1rm ? `${round(entry.e1rm)} kg` : "N/A"}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-end text-sm">
													<AlertDialogTrigger>
														<IconDelete className="h-5 w-5 text-red-500" />
													</AlertDialogTrigger>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					);
				})}

				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete your history for this set.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700"
							onClick={() => {
								if (!selectedEntry) return;
								historyStore.removeHistoryEntry(selectedEntry.id);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
