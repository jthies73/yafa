import { ComponentType, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast/Toaster";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

function render(App: ComponentType) {
	root.render(
		<StrictMode>
			{/* TODO: Refactor this */}
			<ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
				<App />
				<Toaster />
			</ThemeProvider>
		</StrictMode>,
	);
}

export default render;
