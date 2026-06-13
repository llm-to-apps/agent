# agent

Mastra-based agents for os7.

## Agents

- `userAgent` - user-level agent for platform/app management and routing app-specific work.
- `projectUseAgent` - lightweight project-level agent for operating app data through runtime MCP tools.
- `projectDevAgent` - stronger project-level agent for code, debugging, verification, and deployment workflows.

## Development

```sh
npm install
npm run dev
```

Mastra starts its local API server on port `4111` by default.

## Environment

Copy `.env.example` to `.env` and set:

- `OPENROUTER_API_KEY`
- `PLATFORM_BASE_URL`
- `DATABASE_URL`
- `MASTRA_DATABASE_SCHEMA`
- `MANAGER_URL`

Example:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
PLATFORM_BASE_URL=http://os7.localhost
DATABASE_URL=postgresql://os7:change-me-platform-password@localhost:8082/os7_platform
MASTRA_DATABASE_SCHEMA=mastra
MANAGER_URL=http://manager
```

Model selection is passed by the web backend through `requestContext.model`.
If no model is passed, the agent falls back to its code defaults.
The Mastra agent service is trusted by the web backend and should run on a
private network, not as a public API.

Mastra Memory uses `DATABASE_URL` for native message history. `MASTRA_DATABASE_SCHEMA`
defaults to `mastra`, keeping Mastra tables separate from the web Prisma `public`
schema. If `DATABASE_URL` is not set, the agent falls back to
`postgresql://os7:change-me-platform-password@localhost:8082/os7_platform`.

## Scripts

- `npm run dev` - start Mastra dev server
- `npm run build` - build Mastra runtime
- `npm run typecheck` - TypeScript check
