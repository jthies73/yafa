import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { HeaderWithMenu } from "@/components/header/HeaderWithMenu";
import { Button } from "@/components/ui/Button.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/Dialog.tsx";
import { Input } from "@/components/ui/Input.tsx";

import { generateRandomId } from "@/lib/utils.ts";

import { useMeasurementStore } from "@/zustand/measurement-store.ts";
import { useUiStore } from "@/zustand/ui-store.ts";

function MeasurementsPage() {
	// UI store TODO: Improve this
	const uiStore = useUiStore();
	useEffect(() => {
		uiStore.setActivePage("measurements");
	}, []);

	// Navigation
	const navigate = useNavigate();

	// Measurement store
	const measurementStore = useMeasurementStore();

	// Create Measurement modal state
	const [isOpen, setIsOpen] = useState(false);
	const [measurementName, setMeasurementName] = useState<string | undefined>();
	const [measurementUnit, setMeasurementUnit] = useState<string | undefined>();
	const [initialValue, setInitialValue] = useState<number | undefined>();

	function openModal() {
		setMeasurementName(undefined);
		setMeasurementUnit(undefined);
		setIsOpen(true);
	}

	function createMeasurement() {
		if (!measurementName || !measurementUnit) {
			return;
		}
		measurementStore.createMeasurement({
			id: generateRandomId(),
			name: measurementName,
			unit: measurementUnit,
			entries: initialValue
				? [{ id: generateRandomId(), timestamp: new Date().toISOString(), value: initialValue }]
				: [],
		});
		setIsOpen(false);
	}

	return (
		<>
			<HeaderWithMenu />
			<main className="flex min-h-screen flex-col p-5">
				<h1 className="mb-5 text-2xl font-bold">Measurements</h1>
				{measurementStore.measurements.map((measurement) => {
					return (
						<div key={measurement.id} className="flex cursor-pointer py-3">
							<a
								className="flex-1 cursor-pointer"
								onClick={() => navigate(`/measurements/${measurement.id}`)}
							>
								<div>{measurement.name}</div>
							</a>
							<p
								className="flex flex-row items-center space-x-2"
								onClick={() => navigate(`/measurements/${measurement.id}`)}
							>
								{/* Last entry */}
								{measurement.entries.length > 0 ? (
									<div className="flex space-x-1">
										<div>{measurement.entries[measurement.entries.length - 1]?.value || "N/A"}</div>
										<div>{measurement.unit}</div>
									</div>
								) : (
									<div>N/A</div>
								)}
							</p>
						</div>
					);
				})}
				<div className={"fixed bottom-5 left-5 right-5 z-50 flex w-auto justify-center"}>
					<Dialog open={isOpen} onOpenChange={setIsOpen}>
						<DialogTrigger asChild>
							<Button
								variant={"default"}
								className="w-full"
								onClick={() => {
									openModal();
								}}
							>
								Add Measurement
							</Button>
						</DialogTrigger>

						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create new Measurement</DialogTitle>
							</DialogHeader>
							<form
								className="flex flex-col space-y-5"
								onSubmit={(e) => {
									e.preventDefault();
									createMeasurement();
								}}
							>
								{/* Measurement Name */}
								<div>
									<h1 className="mb-1 text-xs font-semibold">Name</h1>
									<Input
										value={measurementName}
										onChange={(e) => {
											setMeasurementName(e.target.value);
										}}
									/>
								</div>
								{/* Measurement Unit */}
								<div>
									<h1 className="mb-1 text-xs font-semibold">Unit</h1>
									<Input
										value={measurementUnit}
										onChange={(e) => {
											setMeasurementUnit(e.target.value);
										}}
									/>
								</div>
								{/* Initial Value */}
								<div>
									<h1 className="mb-1 text-xs font-semibold">Initial Value</h1>
									<Input
										value={initialValue}
										onChange={(e) => {
											const value = parseFloat(e.target.value);
											setInitialValue(value);
										}}
									/>
								</div>
								<DialogFooter>
									<Button type="submit">Save</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</main>
		</>
	);
}

export default MeasurementsPage;
