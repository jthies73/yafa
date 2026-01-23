import { describe, expect, test } from "bun:test";

import { add } from "./sample-service";

describe("SomeService", () => {
	test("should add two numbers correctly", () => {
		const x = add(1, 2);
		expect(x).toBe(3);
	});
});
