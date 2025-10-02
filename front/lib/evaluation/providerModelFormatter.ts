import { formatModelName, PROVIDER_ICONS } from '../models/config';
import type { ModelProvider } from '../models/config';

/**
 * Format provider and model information using a template string
 *
 * Supported placeholders:
 * - {provider} - Provider name (e.g., "OpenAI", "Anthropic Claude")
 * - {model} - Formatted model name (e.g., "GPT-5 mini", "Claude Sonnet 4")
 * - {provider_emoji} - Provider emoji icon (e.g., "🤖", "🧠")
 *
 * @param provider - The model provider ID (e.g., "openai", "anthropic")
 * @param modelId - The model ID (e.g., "gpt-5-mini", "claude-sonnet-4-20250514")
 * @param template - Template string with placeholders (default: "{provider} {model}")
 * @returns Formatted string with placeholders replaced
 */
export function formatProviderModel(
  provider: ModelProvider,
  modelId: string,
  template = '{provider} {model}'
): string {
  // Get friendly provider name
  const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic Claude';

  // Get formatted model name
  const modelName = formatModelName(modelId);

  // Get provider emoji
  const providerEmoji = PROVIDER_ICONS[provider] || '';

  // Replace placeholders in template
  return template
    .replace(/\{provider\}/g, providerName)
    .replace(/\{model\}/g, modelName)
    .replace(/\{provider_emoji\}/g, providerEmoji);
}
