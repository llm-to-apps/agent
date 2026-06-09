# agent

Mastra-based agent orchestrator for llm-to-apps.

## Development

```sh
npm install
npm run dev
```

Mastra starts its local API server on port `4111` by default.

## Environment

Copy `.env.example` to `.env` and set:

- `OPENROUTER_API_KEY`
- `AGENT_MODEL`
- `REDIS_URL`
- `MANAGER_URL`

Example:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=LLM to Apps
AGENT_MODEL=anthropic/claude-sonnet-4
REDIS_URL=redis://localhost:6379
MANAGER_URL=http://manager:8080
```

`AGENT_MODEL` accepts OpenRouter model IDs, for example
`openai/gpt-4o-mini`, `anthropic/claude-sonnet-4`,
`google/gemini-2.5-pro`, or `qwen/qwen3-coder`.

Mastra Memory uses `REDIS_URL` for native message history. If it is not set,
the agent falls back to `redis://localhost:6379`.

## Scripts

- `npm run dev` - start Mastra dev server
- `npm run build` - build Mastra runtime
- `npm run typecheck` - TypeScript check
