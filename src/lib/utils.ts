import { type ClassValue, clsx } from "clsx";

// merge tailwind classes
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

// generate Base64 encoded 20 byte random string
export const generateRandomId = () => {
	return btoa(
		Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
	).toLowerCase();
};

// round to 2 decimal places
export const round = (num: number) => {
	return Math.round((num + Number.EPSILON) * 100) / 100;
};

// round to nearest multiple of roundTo
export const adjustToWeightIncrement = (value: number, roundTo: number) => {
	return Math.floor(round(value) / roundTo) * roundTo;
};

// checks if a number is a natural number
export const isNaturalNumber = (num: number) => {
	return num >= 0 && Math.floor(num) === num;
};

export function getLocalStorageSizeInBytes() {
	let totalSize = 0;

	// Iterate through all keys in localStorage
	for (let i = 0; i < localStorage.length; i++) {
		// Get the key
		const key = localStorage.key(i);
		if (!key) continue;
		// Get the value associated with the key
		const value = localStorage.getItem(key);

		// Calculate the size of the key
		const keySize = new Blob([key]).size;
		if (!value) continue;
		// Calculate the size of the value
		const valueSize = new Blob([value]).size;

		// Add both sizes to the total
		totalSize += keySize + valueSize;
	}

	return totalSize;
}
