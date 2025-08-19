/**
 * Models configuration file
 *
 * This file centralizes all model definitions and makes it easy to update them
 * when new models are released or old ones are deprecated.
 */

// Available model providers
export type ModelProvider = 'openai' | 'anthropic';

// Model type definition
export type ModelOption = {
  label: string;
  value: string;
  description: string;
  emoji: string;
  isAvailable: boolean;
};

// OpenAI Models (Updated May 2025)
export const OPENAI_MODELS: ModelOption[] = [
  {
    label: 'GPT-4.1',
    value: 'gpt-4.1',
    description: 'Successor to GPT-4 Turbo, highly capable flagship model',
    emoji: '🚀',
    isAvailable: true,
  },
  {
    label: 'GPT-5',
    value: 'gpt-5',
    description: 'OpenAI GPT-5 — next-generation flagship model',
    emoji: '⚡',
    isAvailable: true,
  },
  {
    label: 'GPT-5 mini',
    value: 'gpt-5-mini',
    description: 'Compact and fast GPT-5 variant for cost-sensitive use cases',
    emoji: '🟢',
    isAvailable: true,
  },
];

// Get default OpenAI model (use the cost-efficient GPT-5 mini)
export const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';

// Anthropic Models (Updated May 2025)
export const ANTHROPIC_MODELS: ModelOption[] = [
  {
    label: 'Claude Opus 4',
    value: 'claude-opus-4-20250514',
    description: 'Latest most capable model from Anthropic',
    emoji: '✨',
    isAvailable: true,
  },
  {
    label: 'Claude Sonnet 4',
    value: 'claude-sonnet-4-20250514',
    description: 'Latest balanced model from Anthropic',
    emoji: '🏆',
    isAvailable: true,
  },
  {
    label: 'Claude 3.5 Haiku',
    value: 'claude-3-5-haiku-20241022',
    description: 'Latest fast and cost-effective model from Anthropic',
    emoji: '💨',
    isAvailable: true,
  },
];

// Get default Anthropic model (using haiku for cost efficiency)
export const DEFAULT_ANTHROPIC_MODEL = ANTHROPIC_MODELS[2].value;

export const MODEL_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    emoji: '🤖',
    models: OPENAI_MODELS,
    defaultModel: DEFAULT_OPENAI_MODEL,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    emoji: '🧠',
    models: ANTHROPIC_MODELS,
    defaultModel: DEFAULT_ANTHROPIC_MODEL,
  },
];

// Get a dictionary of emoji icons for each provider
export const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
};

// Helper function to format a model ID into a user-friendly name
export function formatModelName(modelId: string): string {
  const openAiModel = OPENAI_MODELS.find((model) => model.value === modelId);
  if (openAiModel) return openAiModel.label;

  const anthropicModel = ANTHROPIC_MODELS.find((model) => model.value === modelId);
  if (anthropicModel) return anthropicModel.label;

  return modelId;
}
