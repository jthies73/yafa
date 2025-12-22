import { useState } from "react";
import { useNavigate } from "react-router";

import AboutModal from "@/components/about/AboutModal.tsx";
import { useTheme } from "@/components/theme-provider";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/Sheet";
import { IconCalculator } from "@/components/ui/icon/IconCalculator";
import { IconDownload } from "@/components/ui/icon/IconDownload";
import { IconDumbbell } from "@/components/ui/icon/IconDumbbell";
import { IconHistory } from "@/components/ui/icon/IconHistory.tsx";
import { IconInfo } from "@/components/ui/icon/IconInfo.tsx";
import { IconMeasurement } from "@/components/ui/icon/IconMeasurement.tsx";
import { IconMoon } from "@/components/ui/icon/IconMoon";
import { IconSun } from "@/components/ui/icon/IconSun";
import { IconUpdate } from "@/components/ui/icon/IconUpdate.tsx";
import { IconUpload } from "@/components/ui/icon/IconUpload.tsx";
import { useToast } from "@/components/ui/toast/use-toast";

import { createFileInput } from "@/lib/upload/upload-helper.ts";
import { cn } from "@/lib/utils";

import { useExerciseStore } from "@/zustand/exercise-store.ts";
import { useHistoryStore } from "@/zustand/history-store.ts";
import { useMeasurementStore } from "@/zustand/measurement-store.ts";
import { useUiStore } from "@/zustand/ui-store.ts";

export function SideBarMenu() {
	const { theme, setTheme } = useTheme();
	const uiStore = useUiStore();
	const navigate = useNavigate();
	const { toast } = useToast();

	// About Modal
	const [aboutModalState, setAboutModalState] = useState<"open" | "closed">("closed");

	// Exercise store
	const exercises = useExerciseStore((state) => state.exercises);

	// History Data
	const historyEntries = useHistoryStore((state) => state.entries);

	// measurement data
	const measurements = useMeasurementStore((state) => state.measurements);

	// JSON Download
	function combineStores() {
		return {
			exercises,
			historyEntries,
			measurements,
		};
	}

	function generateName() {
		// returns `YYYYMMDDhhmmss_yafa-app-state.json`;
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");
		return `${year}${month}${day}${hours}${minutes}${seconds}_yafa-app-state.json`;
	}

	function exportAppState() {
		const data = combineStores();
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.download = generateName();
		link.href = url;
		link.click();
	}

	function importAppState() {
		const input = createFileInput();
		input.onchange = handleFileSelection;
		input.click();
	}

	const handleFileSelection = async (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) {
			return;
		}
		const reader = new FileReader();
		reader.onload = handleFileRead;
		reader.readAsText(file);
	};

	const handleFileRead = async (event: ProgressEvent<FileReader>) => {
		const contents = event.target?.result;
		if (!contents) {
			return;
		}
		try {
			const data = JSON.parse(contents as string);
			if (data.exercises) {
				useExerciseStore.setState({ exercises: data.exercises });
			}
			if (data.historyEntries) {
				useHistoryStore.setState({ entries: data.historyEntries });
			}
			if (data.measurements) {
				useMeasurementStore.setState({ measurements: data.measurements });
			}
			return toast({
				variant: "default",
				title: "App state uploaded",
				description: "The app state has been successfully uploaded",
			});
		} catch (error) {
			console.error(error);
			toast({
				variant: "destructive",
				title: "Invalid file",
				description: "The file you uploaded is not a valid Yafa app state",
			});
		}
	};

	return (
		<Sheet
			open={uiStore.menu === "open"}
			onOpenChange={(open) => {
				uiStore.setMenu(open ? "open" : "closed");
			}}
		>
			<SheetContent className="flex min-h-full flex-col justify-between">
				<ScrollArea className="h-full">
					{/* HEADER */}
					<SheetHeader className="mb-10">
						<SheetTitle>Y A F A</SheetTitle>
						<SheetDescription>V1.1.6</SheetDescription>
					</SheetHeader>
					{/* CONTENT */}
					<div className="space-y-1">
						{/* CALCULATOR MENU ITEM */}
						<div
							onClick={() => {
								navigate("/old/calculator");
								uiStore.setMenu("closed");
							}}
							className={cn(
								"flex cursor-pointer items-center rounded-sm p-2",
								uiStore.activePage === "calculator" && "bg-primary text-primary-foreground",
							)}
						>
							<IconCalculator className="mr-2" />
							<span>Calculator</span>
						</div>
						{/* HISTORY MENU ITEM */}
						<div
							onClick={() => {
								navigate("/old/history");
								uiStore.setMenu("closed");
							}}
							className={cn(
								"flex cursor-pointer items-center rounded-sm p-2",
								uiStore.activePage === "history" && "bg-primary text-primary-foreground",
							)}
						>
							<IconHistory className="mr-2" />
							<span>History</span>
						</div>
						{/* EXERCISES MENU ITEM */}
						<div
							onClick={() => {
								navigate("/old/exercises");
								uiStore.setMenu("closed");
							}}
							className={cn(
								"flex cursor-pointer items-center rounded-sm p-2",
								uiStore.activePage === "exercises" && "bg-primary text-primary-foreground",
							)}
						>
							<IconDumbbell className="mr-2" />
							<span>Exercises</span>
						</div>
						{/* MEASUREMENTS MENU ITEM */}
						<div
							onClick={() => {
								navigate("/old/measurements");
								uiStore.setMenu("closed");
							}}
							className={cn(
								"flex cursor-pointer items-center rounded-sm p-2",
								uiStore.activePage === "measurements" && "bg-primary text-primary-foreground",
							)}
						>
							<IconMeasurement className="mr-2" />
							<span>Measurements</span>
						</div>
					</div>
				</ScrollArea>

				{/* FOOTER */}
				<div>
					{/* reload page */}
					<div
						onClick={() => window.location.reload()}
						className={"flex cursor-pointer justify-end rounded-sm py-2 text-primary"}
					>
						<span>Update</span>
						<IconUpdate className="ml-2" />
					</div>
					{/* Import App State */}
					<div
						onClick={importAppState}
						className={"flex cursor-pointer justify-end rounded-sm py-2 text-primary"}
					>
						<span>Import App State</span>
						<IconUpload className="ml-2" />
					</div>
					{/* Export App State */}
					<div
						onClick={exportAppState}
						className={"flex cursor-pointer justify-end rounded-sm py-2 text-primary"}
					>
						<span>Export App State</span>
						<IconDownload className="ml-2" />
					</div>
					{/* App Info Dialog */}
					<div
						onClick={() => {
							setAboutModalState("open");
						}}
						className={"flex cursor-pointer justify-end rounded-sm py-2 text-primary"}
					>
						<span>About</span>
						<IconInfo className="ml-2" />
					</div>
					<AboutModal aboutModalState={aboutModalState} setAboutModalState={setAboutModalState} />
					{/* Theme Toggle */}
					<div className="flex">
						<a
							className="cursor-pointer p-2"
							onClick={() => {
								setTheme(theme === "dark" ? "light" : "dark");
							}}
						>
							{theme === "dark" ? <IconSun color="white" /> : <IconMoon />}
						</a>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
