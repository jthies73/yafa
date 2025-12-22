import { LogoYafaWithText } from "@/components/header/LogoYafaWithText";
import { IconMenu } from "@/components/ui/icon/IconMenu";

import { useUiStore } from "@/zustand/ui-store.ts";

export function HeaderWithMenu() {
	const uiStore = useUiStore();

	return (
		<>
			<div className="sticky top-0 z-50 flex w-full flex-row items-center bg-background p-2">
				<a className="flex-1 cursor-pointer">
					<LogoYafaWithText className={"p-10px h-[30px] w-[108px]"} />
				</a>
				<a
					onClick={() => {
						uiStore.setMenu("open");
					}}
				>
					<IconMenu className="cursor-pointer" />
				</a>
			</div>
		</>
	);
}
