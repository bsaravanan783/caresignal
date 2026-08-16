import { expect, test } from "vitest";

export function sum(a: number, b: number) {
    return a + b;
}

test('adds 1 + 3 = 4', () => {
    expect(sum(1, 3)).toBe(4);
})
