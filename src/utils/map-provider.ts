// Display names for LiteLLM provider ids. These are provider names, not user-facing text.
export const MAP_PROVIDER = {
  openai: "OpenAI",
  azure: "Azure",
  azure_ai: "Azure AI Studio",
  vertex_ai: "VertexAI",
  palm: "PaLM",
  gemini: "Gemini",
  anthropic: "Anthropic",
  sagemaker: "AWS SageMaker",
  bedrock: "AWS Bedrock",
  bedrock_converse: "AWS Bedrock Converse",
  mistral: "Mistral AI",
  anyscale: "Anyscale",
  databricks: "Databricks",
  ollama: "Ollama",
  perplexity: "Perplexity AI",
  friendliai: "FriendliAI",
  groq: "Groq",
  fireworks_ai: "Fireworks AI",
  cloudflare: "Cloudflare Workers AI",
  deepinfra: "DeepInfra",
  ai21: "AI21",
  replicate: "Replicate",
  voyage: "Voyage AI",
  openrouter: "OpenRouter",
  openhands: "OpenHands",
  lemonade: "Lemonade",
  clarifai: "Clarifai",
  moonshot: "Moonshot",
  agentrouter: "AgentRouter",
  venice: "Venice.ai",
} as const;

export type ProviderId = keyof typeof MAP_PROVIDER;

// Reverse lookup: display name (case-insensitive, trimmed) -> provider id.
const DISPLAY_NAME_TO_ID = new Map<string, ProviderId>(
  (Object.entries(MAP_PROVIDER) as [ProviderId, string][]).map(
    ([id, displayName]) => [displayName.trim().toLowerCase(), id],
  ),
);

/**
 * Map a LiteLLM provider id to its display name.
 * Unknown, empty, or non-string values pass through unchanged so callers
 * never render a blank label for a provider the map doesn't know yet.
 */
export const mapProvider = (provider: string): string => {
  if (typeof provider !== "string") return provider;
  const trimmed = provider.trim();
  if (!trimmed) return provider;
  return MAP_PROVIDER[trimmed.toLowerCase() as ProviderId] ?? trimmed;
};

/**
 * Map a display name back to its LiteLLM provider id.
 * Matching is case-insensitive and trims whitespace; unknown values pass
 * through unchanged.
 */
export const getProviderId = (displayName: string): string => {
  if (typeof displayName !== "string") return displayName;
  const normalized = displayName.trim().toLowerCase();
  if (!normalized) return displayName;
  return DISPLAY_NAME_TO_ID.get(normalized) ?? displayName;
};
