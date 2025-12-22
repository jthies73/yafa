import { IconMenu } from "@/components/ui/icon/IconMenu";

export function ButtonMenu() {
	return (
		<div
			className="h-50px w-50px flex items-center justify-center hover:cursor-pointer hover:opacity-50"
			onClick={() => {
				alert("Menu Clicked");
			}}
		>
			<IconMenu />
		</div>
	);
}
