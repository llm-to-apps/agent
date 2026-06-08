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

- `OPENAI_API_KEY`
- `AGENT_MODEL`
- `MANAGER_URL`

## Scripts

- `npm run dev` - start Mastra dev server
- `npm run build` - build Mastra runtime
- `npm run typecheck` - TypeScript check
