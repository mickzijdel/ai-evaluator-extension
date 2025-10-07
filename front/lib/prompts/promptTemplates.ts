// Prompt template system for AI evaluations
// This file contains all prompt templates and their configurations

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemMessage: string;
  rankingKeyword: string;
  additionalInstructions?: string;
}

export interface PromptVariables {
  criteriaString: string;
  rankingKeyword?: string;
  additionalInstructions?: string;
  notesInstructions?: string;
}

// SPAR Single-Axis Template - derived from SPAR first axis (General Promise)
// This is the default single-axis evaluation template when multi-axis is disabled
export const SPAR_SINGLE_AXIS_TEMPLATE: PromptTemplate = {
  id: 'spar_single',
  name: 'General Promise Evaluation',
  description: 'Single-axis evaluation using SPAR General Promise criteria',
  systemMessage: `Evaluate the application above, based on the following rubric: {criteriaString}

You should ignore general statements or facts about the world, and focus on what the applicant themselves has achieved. You do not need to structure your assessment similar to the answers the user has given.

=== MANDATORY OUTPUT FORMAT ===
Your response MUST end with this EXACT format on the last line:
{rankingKeyword} = [integer from 1-5]

This is REQUIRED. Do not add any text after this line.
================================

RATING CONSTRAINTS:
- Your rating MUST be an integer (whole number only)
- Your rating MUST be between 1 and 5 (inclusive)
- DO NOT use ratings above 5 or below 1
- If the rubric mentions different scale values, convert them to the 1-5 scale

Now, provide your evaluation:

1. First explain your reasoning thinking step by step.{notesInstructions}

2. MANDATORY FINAL LINE: End with exactly: {rankingKeyword} = [your integer score from 1-5]
   (Do not add anything after this line){additionalInstructions}`,
  rankingKeyword: 'FINAL_RANKING',
  additionalInstructions: '',
};

// Legacy template alias for backward compatibility
// @deprecated Use SPAR_SINGLE_AXIS_TEMPLATE instead
export const ACADEMIC_TEMPLATE = SPAR_SINGLE_AXIS_TEMPLATE;

// Default settings for new installations
export const DEFAULT_PROMPT_SETTINGS = {
  selectedTemplate: SPAR_SINGLE_AXIS_TEMPLATE.id,
  customTemplate: null as PromptTemplate | null,
  rankingKeyword: SPAR_SINGLE_AXIS_TEMPLATE.rankingKeyword,
  additionalInstructions: '',
};

// Available templates
export const AVAILABLE_TEMPLATES: PromptTemplate[] = [SPAR_SINGLE_AXIS_TEMPLATE];

// Get template by ID with fallback to default
export const getTemplate = (templateId: string): PromptTemplate => {
  return AVAILABLE_TEMPLATES.find((t) => t.id === templateId) || SPAR_SINGLE_AXIS_TEMPLATE;
};
