import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/Button";

import { useTheme } from "../theme-provider";

interface Props {
	onSelectionChange: (value: 3 | 6 | 7 | 8 | 8.5 | 9 | 9.5 | 10 | 11) => void;
	value: 3 | 6 | 7 | 8 | 8.5 | 9 | 9.5 | 10 | 11;
	hideFail?: boolean;
	className?: string;
}

export function ButtonGroupRpe({ value, onSelectionChange, hideFail, className = "" }: Props) {
	const [rpe, setRpe] = useState(value);

	const { theme } = useTheme();

	const colors = {
		green: theme === "light" ? "bg-[#7bece3]" : "bg-[#008e84]",
		lime: theme === "light" ? "bg-lime-200" : "bg-lime-900",
		yellow: theme === "light" ? "bg-yellow-200" : "bg-yellow-900",
		orange: theme === "light" ? "bg-orange-200" : "bg-orange-900",
		red: theme === "light" ? "bg-red-200" : "bg-red-900",
		hover: theme === "light" ? "hover:bg-slate-100" : "hover:bg-slate-800",
	};

	useEffect(() => {
		setRpe(value);
	}, [value]);

	return (
		// space-y-1 is not working here
		<div className={cn("flex space-x-1", className)}>
			<Button
				onClick={() => {
					setRpe(3);
					onSelectionChange(3);
				}}
				variant={"outline"}
				className={cn(
					"flex-1",
					rpe === 3 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`,
					rpe >= 8 ? "hidden" : "",
				)}
			>
				no effort
			</Button>
			<Button
				onClick={() => {
					setRpe(6);
					onSelectionChange(6);
				}}
				variant={"outline"}
				className={cn(
					"flex-1",
					rpe === 6 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`,
					rpe >= 8 ? "hidden" : "",
				)}
			>
				6
			</Button>
			<Button
				onClick={() => {
					setRpe(7);
					onSelectionChange(7);
				}}
				variant={"outline"}
				className={cn(
					"flex-1",
					rpe === 7 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`,
					rpe >= 9 ? "hidden" : "",
				)}
			>
				7
			</Button>

			<Button
				onClick={() => {
					setRpe(8);
					onSelectionChange(8);
				}}
				variant={"outline"}
				className={cn("flex-1", rpe === 8 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`)}
			>
				8
			</Button>
			<Button
				onClick={() => {
					setRpe(8.5);
					onSelectionChange(8.5);
				}}
				variant={"outline"}
				className={cn(
					"flex-1",
					rpe === 8.5 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`,
					rpe < 8 ? "hidden" : "",
				)}
			>
				8.5
			</Button>
			<Button
				onClick={() => {
					setRpe(9);
					onSelectionChange(9);
				}}
				variant={"outline"}
				className={cn("flex-1", rpe === 9 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`)}
			>
				9
			</Button>
			<Button
				onClick={() => {
					setRpe(9.5);
					onSelectionChange(9.5);
				}}
				variant={"outline"}
				className={cn(
					"flex-1",
					rpe === 9.5 ? `${colors.green} hover:${colors.green}` : `${colors.hover}`,
					rpe <= 8.5 ? "hidden" : "",
				)}
			>
				9.5
			</Button>
			<Button
				onClick={() => {
					setRpe(10);
					onSelectionChange(10);
				}}
				variant={"outline"}
				className={cn("flex-1", rpe === 10 ? `${colors.yellow} hover:${colors.yellow}` : `${colors.hover}`)}
			>
				10
			</Button>
			{hideFail ? null : (
				<Button
					onClick={() => {
						setRpe(11);
						onSelectionChange(11);
					}}
					variant={"outline"}
					className={cn(
						"flex-1",
						rpe === 11 ? `${colors.red} hover:${colors.red}` : `${colors.hover}`,
						rpe < 8 ? "hidden" : "",
					)}
				>
					FAIL
				</Button>
			)}
		</div>
	);
}
