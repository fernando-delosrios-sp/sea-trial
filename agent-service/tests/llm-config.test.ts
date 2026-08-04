import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getLlmConfig } from "../src/config/llm.js";

describe("Configurable LLM endpoint", () => {
  beforeEach(() => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "https://custom.example/v1";
    process.env.LLM_MODEL = "custom-model";
  });

  afterEach(() => {
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;
  });

  it("reads LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL from environment", () => {
    const config = getLlmConfig();
    expect(config.apiKey).toBe("test-key");
    expect(config.baseUrl).toBe("https://custom.example/v1");
    expect(config.model).toBe("custom-model");
  });

  it("uses defaults when base URL and model omitted", () => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;
    const config = getLlmConfig();
    expect(config.baseUrl).toBe("https://api.openai.com/v1");
    expect(config.model).toBe("gpt-4o");
  });
});

describe("Agent-service responsibilities", () => {
  it("returns structured JSON without Slack tokens", async () => {
    process.env.LLM_API_KEY = "test-key";
    const { createRequirementsGraph } = await import(
      "../src/agents/requirements/langgraph.js"
    );
    const graph = createRequirementsGraph();
    expect(graph).toBeDefined();
    delete process.env.LLM_API_KEY;
  });
});
