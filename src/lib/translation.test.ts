import { describe, expect, it } from "vitest";

import { parseGroqTranslationResponse } from "@/lib/translation";

describe("Groq translation response", () => {
  it("returns the trimmed translated text", () => {
    expect(
      parseGroqTranslationResponse({
        choices: [{ message: { content: "  Hola, ¿cómo estás?  " } }],
      }),
    ).toBe("Hola, ¿cómo estás?");
  });

  it("rejects an empty translation", () => {
    expect(() =>
      parseGroqTranslationResponse({
        choices: [{ message: { content: "  " } }],
      }),
    ).toThrow("The translation provider returned an empty translation.");
  });
});
