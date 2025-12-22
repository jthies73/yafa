import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import { HeaderWithMenu } from "@/components/header/HeaderWithMenu";
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
} from "@/components/ui/AlertDialog.tsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconDelete } from "@/components/ui/icon/IconDelete.tsx";
import { useToast } from "@/components/ui/toast/use-toast";

import { generateRandomId } from "@/lib/utils.ts";

import { useCalculatorStore } from "@/zustand/calculator-store.ts";
import { Measurement, MeasurementEntry, useMeasurementStore } from "@/zustand/measurement-store.ts";

interface RouteParams extends Record<string, string | undefined> {
	id?: string;
}

export function EditMeasurementPage() {
	const { toast } = useToast();
	const { id } = useParams<RouteParams>();

	// Navigation
	const navigate = useNavigate();

	// Stores
	const measurementStore = useMeasurementStore();
	const measurement = measurementStore.findMeasurement(id + "");

	const calculatorStore = useCalculatorStore();

	// State
	const [value, setValue] = useState<number | undefined>(undefined);
	const [selectedEntry, setSelectedEntry] = useState<MeasurementEntry | null>(null);

	const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);

	// TODO: Refactor
	if (!id) return null;
	if (!measurement) return null;

	return (
		<>
			<HeaderWithMenu />
			<main className="flex min-h-screen flex-col p-5">
				<AlertDialog>
					<div className="flex items-center justify-between">
						<h1 className="mb-5 text-2xl font-bold">{measurement.name}</h1>
						{measurement.id !== "1" && (
							<AlertDialogTrigger asChild className={"align-middle"}>
								<a
									className="cursor-pointer"
									onClick={() => {
										setSelectedMeasurement(measurement);
									}}
								>
									<IconDelete className={"text-red-600"} />
								</a>
							</AlertDialogTrigger>
						)}
					</div>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Are you sure you want to delete &quot;{selectedMeasurement?.name}&quot;?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete your measurement.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 hover:bg-red-700"
								onClick={() => {
									if (!selectedMeasurement) return;
									measurementStore.deleteMeasurement(selectedMeasurement.id);
									navigate("/measurements");
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				<AlertDialog>
					<div className="overflow-x-auto">
						{measurement.entries.length > 0 ? (
							<table className="w-full divide-y divide-gray-200">
								<thead>
									<tr>
										<th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
											Date
										</th>
										<th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
											Value
										</th>
									</tr>
								</thead>
								<tbody className={"divide-y divide-gray-200"}>
									{measurement.entries.map((entry) => {
										const friendlyDate = new Date(entry.timestamp).toLocaleTimeString("de-DE", {
											year: "numeric",
											month: "short",
											day: "numeric",
											hour: "numeric",
											minute: "numeric",
										});
										return (
											<tr key={entry.id}>
												<td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
													{friendlyDate}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm">
													{entry.value} {measurement.unit}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-end text-sm">
													<AlertDialogTrigger asChild className={"align-middle"}>
														<a
															className="cursor-pointer"
															onClick={() => {
																setSelectedEntry(entry);
															}}
														>
															<IconDelete className={"text-red-600"} />
														</a>
													</AlertDialogTrigger>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<div>No entries</div>
						)}
					</div>
					<AlertDialogContent>
						<AlertDialogHeader>
							Are you sure you want to delete this entry?
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete your measurement entry.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 hover:bg-red-700"
								onClick={() => {
									if (!selectedEntry) return;
									measurementStore.deleteMeasurementEntry(measurement.id, selectedEntry.id);
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				<form
					className="mt-5 flex space-x-1"
					onSubmit={(e) => {
						e.preventDefault();
						if (value === undefined) {
							toast({
								variant: "destructive",
								title: "Please enter a value",
								description: "You need to enter a value to add it to the measurement",
							});
							return;
						}
						measurementStore.addMeasurementEntry(id, {
							id: generateRandomId(),
							timestamp: new Date().toISOString(),
							value: value,
						});

						if (id === "1") {
							calculatorStore.setBodyweight(value);
						}
					}}
				>
					{/* Text input for number */}
					<Input
						type="number"
						placeholder="Enter value"
						value={value}
						onChange={(e) => setValue(parseFloat(e.target.value))}
					/>
					{/* Button to add the value */}
					<Button type="submit">Add</Button>
				</form>
			</main>
		</>
	);
}
