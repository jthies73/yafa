import React from "react";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast/Toaster";
import App from "./App";

import "./globals.css";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
	<StrictMode>
		<ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
			<App />
			<Toaster />
		</ThemeProvider>
	</StrictMode>,
);
