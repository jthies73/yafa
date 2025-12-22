import { create } from "zustand";

// Define the store state and actions
interface UiStore {
	menu: "open" | "closed";
	toggleMenu: () => void;
	setMenu: (menu: "open" | "closed") => void;
	activePage?: "calculator" | "exercises" | "measurements" | "history";
	setActivePage: (page: "calculator" | "exercises" | "measurements" | "history") => void;
}

// Create the Zustand store
const useUiStore = create<UiStore>()((set) => ({
	menu: "closed",
	toggleMenu: () => {
		set((state) => ({
			menu: state.menu === "open" ? "closed" : "open",
		}));
	},
	setMenu: (menu) => {
		set((state) => ({
			...state,
			menu: menu,
		}));
	},
	setActivePage: (page) => {
		set((state) => ({
			...state,
			activePage: page,
		}));
	},
}));

export { useUiStore };
