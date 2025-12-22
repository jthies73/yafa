import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog.tsx";

import { getLocalStorageSizeInBytes } from "@/lib/utils.ts";

import { useExerciseStore } from "@/zustand/exercise-store.ts";
import { useHistoryStore } from "@/zustand/history-store.ts";
import { useMeasurementStore } from "@/zustand/measurement-store.ts";

interface Props {
	aboutModalState: "open" | "closed";
	setAboutModalState: (open: "open" | "closed") => void;
}

function AboutModal({ aboutModalState, setAboutModalState }: Props) {
	const exercises = useExerciseStore((state) => state.exercises);
	const historyEntries = useHistoryStore((state) => state.entries);
	const measurements = useMeasurementStore((state) => state.measurements);

	return (
		<Dialog
			open={aboutModalState === "open"}
			onOpenChange={() => setAboutModalState(aboutModalState === "open" ? "closed" : "open")}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>About</DialogTitle>
					<DialogDescription>Version 1.1.6</DialogDescription>
				</DialogHeader>
				<table>
					<tbody>
						<tr>
							<td className="text-xs">Exercise count:</td>
							<td className="text-xs">{exercises.length}</td>
						</tr>
						<tr>
							<td className="text-xs">History entries:</td>
							<td className="text-xs">{historyEntries.length}</td>
						</tr>
						<tr>
							<td className="text-xs">Measurement count:</td>
							<td className="text-xs">{measurements.length}</td>
						</tr>
						<tr>
							<td className="text-xs">Local storage utilization:</td>
							<td className="text-xs">{Math.round(getLocalStorageSizeInBytes() / 1024)} KB / 5120 KB</td>
						</tr>
					</tbody>
				</table>
			</DialogContent>
		</Dialog>
	);
}

export default AboutModal;
