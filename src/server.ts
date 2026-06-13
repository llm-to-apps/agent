import "dotenv/config";

import { serve } from "@hono/node-server";
import type { Http2Bindings, HttpBindings } from "@hono/node-server";
import { createHonoServer } from "@mastra/deployer/server";

import { mastra } from "./mastra";

type MastraLifecycle = {
  shutdown?: () => Promise<void>;
  startEventEngine: () => Promise<void>;
  startWorkers?: () => Promise<void>;
};

const shutdownTimeoutMs = Number(process.env.MASTRA_SHUTDOWN_TIMEOUT_MS || 10 * 60_000);
const shutdownPollMs = Number(process.env.MASTRA_SHUTDOWN_POLL_MS || 250);
const port = Number(process.env.PORT || 4111);
const host = process.env.MASTRA_HOST;
const apiPrefix = mastra.getServer()?.apiPrefix ?? "/api";

let activeResponses = 0;
let draining = false;
let shuttingDown = false;

const app = await createHonoServer(mastra, { tools: {} });

const server = serve(
  {
    fetch: async (request: Request, env: HttpBindings | Http2Bindings) => {
      if (draining) {
        return new Response(JSON.stringify({ ok: false, message: "Server is shutting down" }), {
          status: 503,
          headers: {
            "content-type": "application/json",
            connection: "close",
          },
        });
      }

      return trackResponseBody(
        await app.fetch(request, env),
        new URL(request.url).pathname,
      );
    },
    hostname: host,
    port,
  },
  () => {
    console.info("[mastra-server] API running", {
      pid: process.pid,
      url: `http://${host ?? "localhost"}:${port}${apiPrefix}`,
    });

    if (process.send) {
      process.send({
        type: "server-ready",
        port,
        host: host ?? "localhost",
      });
    }
  },
);

const injectWebSocket = (app as unknown as { injectWebSocket?: (server: unknown) => void })
  .injectWebSocket;
injectWebSocket?.(server);

const lifecycle = mastra as unknown as MastraLifecycle;
if (typeof lifecycle.startWorkers === "function") {
  await lifecycle.startWorkers();
} else {
  await lifecycle.startEventEngine();
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

function trackResponseBody(response: Response, pathname: string) {
  if (!response.body) {
    return response;
  }

  activeResponses += 1;
  const trackedBody = trackReadableStream(response.body, () => {
    activeResponses -= 1;
    console.info("[mastra-server] response finished", {
      activeResponses,
      pathname,
    });
  });

  return new Response(trackedBody, response);
}

function trackReadableStream(stream: ReadableStream<Uint8Array>, onDone: () => void) {
  const reader = stream.getReader();
  let done = false;

  const finish = () => {
    if (done) {
      return;
    }

    done = true;
    onDone();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          finish();
          controller.close();
          return;
        }

        controller.enqueue(result.value);
      } catch (error) {
        finish();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        finish();
      }
    },
  });
}

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    console.warn("[mastra-server] shutdown already in progress", { signal });
    return;
  }

  shuttingDown = true;
  draining = true;
  console.info("[mastra-server] shutdown requested", {
    activeResponses,
    pid: process.pid,
    signal,
    timeoutMs: shutdownTimeoutMs,
  });

  server.close();
  closeIdleConnections(server);

  const drained = await waitForDrain();
  if (!drained) {
    console.warn("[mastra-server] shutdown timed out with active responses", {
      activeResponses,
      timeoutMs: shutdownTimeoutMs,
    });
  }

  await shutdownMastra();
  process.exit(0);
}

async function waitForDrain() {
  const startedAt = Date.now();

  while (activeResponses > 0) {
    if (Date.now() - startedAt >= shutdownTimeoutMs) {
      return false;
    }

    await sleep(shutdownPollMs);
  }

  console.info("[mastra-server] all responses drained", {
    elapsedMs: Date.now() - startedAt,
  });
  return true;
}

async function shutdownMastra() {
  if (typeof lifecycle.shutdown !== "function") {
    return;
  }

  try {
    await lifecycle.shutdown();
    console.info("[mastra-server] mastra lifecycle shutdown complete");
  } catch (error) {
    console.error("[mastra-server] mastra lifecycle shutdown failed", error);
  }
}

function closeIdleConnections(serverToClose: unknown) {
  const maybeServer = serverToClose as {
    closeIdleConnections?: () => void;
  };

  maybeServer.closeIdleConnections?.();
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
