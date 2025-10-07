import type { Prompt } from '../getChatCompletion';
// Prompt builder - handles template variable substitution and prompt construction
import type { PromptTemplate, PromptVariables } from './promptTemplates';

export interface PromptConfig {
  template: PromptTemplate;
  variables: PromptVariables;
}

/**
 * Build a complete prompt from template and variables
 */
export const buildPrompt = (applicantData: string, config: PromptConfig): Prompt => {
  const { template, variables } = config;

  // Substitute variables in the system message
  let systemMessage = template.systemMessage
    .replace('{criteriaString}', variables.criteriaString)
    .replace('{rankingKeyword}', variables.rankingKeyword || template.rankingKeyword);

  // Add notes instructions if provided
  if (variables.notesInstructions?.trim()) {
    const rankingKw = variables.rankingKeyword || template.rankingKeyword;
    const notesSection = `

   Then, provide structured evaluation notes between [EVALUATION_NOTES] and [END_EVALUATION_NOTES] markers summarizing:
   ${variables.notesInstructions.trim()}

   NOTE: These notes are ADDITIONAL analysis. You still MUST end with the ${rankingKw} line.`;
    systemMessage = systemMessage.replace('{notesInstructions}', notesSection);
  } else {
    // Remove notes section entirely if not provided
    systemMessage = systemMessage.replace('{notesInstructions}', '');
  }

  // Add additional instructions if provided
  if (variables.additionalInstructions?.trim()) {
    systemMessage = systemMessage.replace(
      '{additionalInstructions}',
      `\n\n${variables.additionalInstructions.trim()}`
    );
  } else {
    systemMessage = systemMessage.replace('{additionalInstructions}', '');
  }

  return [
    { role: 'user', content: applicantData },
    { role: 'system', content: systemMessage },
  ];
};

/**
 * Get the ranking keyword for result extraction
 */
export const getRankingKeyword = (config: PromptConfig): string => {
  return config.variables.rankingKeyword || config.template.rankingKeyword;
};
