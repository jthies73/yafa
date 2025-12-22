export const createFileInput = () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json, .csv";
	return input;
};
