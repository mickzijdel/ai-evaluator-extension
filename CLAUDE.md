# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Evaluator Extension is an AI-driven applicant evaluation extension for airtable with two main components:
- **Frontend** (`/front`): Airtable extension for evaluating applications using LLMs
- **Backend** (`/server`): MCP server for extensible plugin-based AI processing, enrichment (LinkedIn, PDF resume parsing), and multi-axis evaluation

The frontend can operate standalone (direct API calls to OpenAI/Anthropic) or integrate with the backend server for advanced features like enrichment and multi-axis scoring.

## Development Commands

### Frontend (Airtable Extension)

```bash
cd front

# Development
bun install              # Install dependencies
bun run start           # Start dev server (alias for start:applications)
bun run dev             # Same as start

# Code quality
bun run type-check      # TypeScript type checking
bun run lint            # Lint with Biome
bun run lint:fix        # Auto-fix lint issues
bun run format          # Format code with Biome
bun run check           # Run all checks
bun run check:fix       # Fix all auto-fixable issues
bun run biome:ci        # CI checks

# Testing & deployment
bun run test            # Run Jest tests
bun run deploy          # Deploy to Airtable
```

**Note:** Configure Airtable connection in `.block/applications.remote.json` before running.

### Backend (MCP Server)

```bash
cd server

# Development (Docker - recommended)
docker-compose up --build -d    # Start all services
docker-compose logs -f          # View logs
docker-compose down             # Stop services

# Development (Local with Poetry)
poetry install          # Install dependencies
poetry run python -m src.api.main   # Run server

# Code quality
make format            # Format with black and isort
make lint              # Lint with flake8 and mypy
make test              # Run pytest
make test-cov          # Run tests with coverage

# Utility
make clean             # Remove generated files
make docker-logs       # Show Docker logs
make redis-cli         # Connect to Redis
```

**Note:** Copy `example.env` to `.env` and configure API keys before running.

## Architecture

### Frontend Structure

- **`frontend/`** - React UI components for the Airtable extension
  - `MainPage.tsx` - Main orchestration UI (batching, evaluation trigger)
  - `components/` - Reusable UI components (SettingsDialog, PresetManager, FailedApplicantsModal, helpSystem)
- **`lib/`** - Core business logic
  - `evaluateApplicants.ts` - Main evaluation orchestrator (coordinate API calls, enrichment, scoring)
  - `evaluation/` - Modular evaluation utilities
    - `airtableWriter.ts` - Write evaluation results to Airtable
    - `extractors.ts` - Extract LinkedIn, PDF, multi-axis data from server responses
  - `getChatCompletion/` - LLM provider integrations
    - `openai/` - OpenAI API client
    - `anthropic/` - Anthropic API client
    - `server/` - MCP server client with token refresh and retry logic
    - `apiKeyManager.ts` - Manage per-request or cached API keys
  - `prompts/` - Prompt templates and builders
    - `promptTemplates.ts` - SPAR (default multi-axis) and single-axis templates
    - `promptBuilder.ts` - Construct prompts from applicant data
  - `estimation/` - Cost and token estimation
  - `concurrency/` - Batch processing configuration
  - `models/` - Model definitions and defaults
  - `preset.ts` - Preset management (Airtable field mappings, feature flags)
  - `logger.ts` - Centralized logging

**Key behavioral details:**
- **Evaluation modes:** Single-axis (SPAR's "General Promise" axis) or multi-axis (full SPAR template with 7 axes).
- **Enrichment:** Optional LinkedIn and PDF resume enrichment via server plugins. Extracted data is written to dedicated Airtable fields alongside evaluation scores.
- **Logs:** Combined logs go to the main Logs field; dedicated enrichment fields store LinkedIn Data, PDF Resume Data, Multi-Axis scores separately.
- **Server mode:** When enabled, frontend sends evaluation requests to the MCP server with `enrichLinkedIn`, `enrichPDF`, `multiAxis` flags. Server handles LLM calls, plugin execution, and returns enriched data.
- **Token refresh:** Access tokens expire after 60 minutes. Frontend caches tokens and refreshes 5 minutes before expiry.

### Backend Structure

- **`src/api/`** - FastAPI application
  - `main.py` - Application entry point
  - `auth.py` - OAuth2 JWT authentication
  - `models.py` - Request/response models
  - `llm/` - LLM integration
    - `prompt_system/` - Template management and prompt building
    - `providers/` - OpenAI and Anthropic provider implementations
    - `proxy/` - LLM proxy with evaluation endpoint
- **`src/core/`** - Core abstractions
  - `plugin_system/` - Plugin loader, manager, and base classes
  - `routing/` - Semantic routing to plugins
  - `llm/` - LLM abstractions and provider interface
  - `external_mcp/` - External MCP server integration
  - `exceptions.py` - Custom exceptions
- **`src/plugins/`** - Plugin implementations
  - `pdf_resume_plugin/` - PDF resume parser with LLM fallback
  - `linkedin_external_plugin.py` - LinkedIn profile enrichment
  - `calculator_plugin.py`, `echo_plugin.py` - Example plugins
- **`src/config/`** - Configuration and settings
- **`src/utils/`** - Shared utilities

**Key architectural patterns:**
- **Plugin system:** Plugins are auto-discovered from `src/plugins/`. Each plugin implements `Plugin` base class with `initialize()`, `execute()`, `get_metadata()`.
- **Semantic routing:** LLM-powered router directs requests to appropriate plugins based on query intent.
- **Evaluation endpoint:** `/api/v1/llm/evaluate` accepts applicant data, criteria, enrichment flags (`use_plugin`, `source_url`), and multi-axis flags. Returns evaluation with optional enrichment data.
- **PDF parsing:** Uses `pdfminer.six` for extraction, LLM for structured normalization (preserves UTF-8 diacritics, percentages, "Present" dates).
- **Authentication:** JWT tokens with 30-minute default expiry. Use `/api/v1/auth/token` to obtain token, then pass in `Authorization: Bearer <token>` header.

## Testing Strategy

- **Frontend:** Manual validation preferred until core flows stabilize. Run small evaluations after changes to verify enrichment fields populate correctly.
- **Backend:** Use `pytest` for unit and integration tests. Test multi-axis extraction, enrichment parsing, prompt building.
- **Integration:** End-to-end test: frontend → server → Airtable write cycle.

## Important Implementation Notes

### Frontend

1. **Centralized modules:** Use `lib/evaluation/airtableWriter.ts` and `lib/evaluation/extractors.ts` for writing results and extracting enrichment data. Do not duplicate logic in `evaluateApplicants.ts`.
2. **Logging levels:** Use `Logger.error()` for failures, `Logger.info()` for high-level operations, `Logger.debug()` for detailed diagnostics.
3. **Prompt templates:** Default is SPAR multi-axis. Single-axis mode derives from SPAR's first axis ("General Promise").
4. **Server timeout/retry:** Configurable via `globalConfig.serverRequestTimeout` (ms) and `globalConfig.serverMaxRetries`.
5. **Enrichment extraction:** LinkedIn/PDF data includes both enrichment logs and extracted data. Use regex extractors with marker blocks from server responses.

### Backend

1. **Logging:** Use centralized Python logging (not structlog). Mask sensitive data. Use INFO for high-level, DEBUG for verbose.
2. **PDF normalization:** Preserve UTF-8 diacritics, keep "Present" for current positions, retain percentages, output strict JSON.
3. **Multi-axis template:** SPAR is default with 7 axes (General Promise, ML Skills, Software Engineering, Policy Experience, AI Safety Understanding, Path to Impact, Research Experience).
4. **Provider fallback:** PDF plugin uses LLM fallback with provider API key passed from frontend if text extraction fails.
5. **Plugin development:** Add new plugins to `src/plugins/`. They are auto-discovered. Implement `Plugin` interface.

## Common Workflows

### Add a new evaluation criterion (frontend)

1. Add field to Airtable base evaluation table
2. Update preset configuration via extension UI or modify `lib/preset.ts` default
3. Update prompt template in `lib/prompts/promptTemplates.ts` if needed

### Add a new enrichment plugin (backend)

1. Create plugin file in `src/plugins/`
2. Implement `Plugin` base class (see `pdf_resume_plugin/` or `linkedin_external_plugin.py`)
3. Plugin is auto-discovered on server restart
4. Update frontend to pass relevant flags (`use_plugin`, `source_url`) when calling server

### Debug enrichment data not populating

1. Check server logs for enrichment plugin execution
2. Verify frontend extractors in `lib/evaluation/extractors.ts` use correct regex patterns
3. Confirm `airtableWriter.ts` is being called (not local duplicates)
4. Check Airtable field IDs in preset configuration match actual base fields

## Configuration Files

- **Frontend:**
  - `.block/applications.remote.json` - Airtable base/block IDs
  - `lib/env.ts` - Environment configuration (created from `env.template.ts` on install)
  - `lib/models/config.ts` - Model definitions and defaults
  - `lib/prompts/promptConfig.ts` - Prompt configuration

- **Backend:**
  - `.env` - Environment variables (copy from `example.env`)
  - `pyproject.toml` - Python dependencies and tool config
  - `docker-compose.yml` - Service orchestration

## Current State & Roadmap

Refer to `.PLAN.md` for detailed progress tracking and next steps. Key current focus:
- Consolidating writer/extractor usage to centralized modules
- Improving enrichment field population reliability
- Refactoring large orchestration files for maintainability
