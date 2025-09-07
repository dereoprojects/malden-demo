# Madlen Chat (Case Study)

A local, web-based chat UI that talks to multiple models via **OpenRouter**, stores chats **in the browser** (no backend DB), streams replies, and ships basic **OpenTelemetry** traces to **Jaeger** via Docker.

---

## 1) Tech stack & why

* **Next.js (App Router) + TypeScript** – fast DX, file-based routes, easy server functions for streaming.
* **shadcn/ui + Tailwind CSS** – clean, composable UI primitives; minimal styling overhead.
* **IndexedDB via Dexie** – persistent local chat history (meets the “local storage” requirement) with a queryable schema.
* **OpenRouter API** – single gateway to many LLMs; we fetch **free** models and support **vision** when a model allows images.
* **Streaming over a single POST (NDJSON)** – robust, stateless streaming (no server memory hand-offs); easy cancel with `AbortController`.
* **OpenTelemetry → Jaeger** – traces for key operations (UI action → `/api/chat/stream` → upstream OpenRouter). Jaeger runs locally via Docker Compose.

> No server database is used. Everything (sessions/messages) is stored locally in IndexedDB for durability across refreshes.

---

## 2) Setup & local run

### Prereqs

* Node 18+ and **pnpm** installed
* Docker & Docker Compose

### Env vars

Create `.env` (or `.env.local`) in the project root. You can use `.env.example` for this:

```bash
#paste this to .env on root and change the OPENROUTER_API_KEY
# OpenRouter
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
# OpenTelemetry -> Jaeger (dev)
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318 #Change this if you didn't use the docker compose
OTEL_SERVICE_NAME=madlen-web

# Optional properties used in headers
APP_BASE_URL=http://localhost:3000
APP_TITLE=Madlen Chat

```

### Run with Jaeger via Docker Compose (recommended)

This starts **Jaeger v2** and the Next dev server together.

```bash
pnpm run dev:stack
```

* App: [http://localhost:3000](http://localhost:3000)
* Jaeger UI: [http://localhost:16686](http://localhost:16686)


### Optional: Install deps (You don't need to but good for code inspection)

```bash
pnpm install
```

### Run app only (if you already have Jaeger elsewhere)

```bash
pnpm run dev
```

---

## 3) Using the app

* Pick a model from the **Model** combobox.

  * We fetch **free models** from OpenRouter; **vision-capable** models appear first and show a small image icon.
  * Image upload UI shows **only** when the selected model supports images.
* Type a message (optionally add an image for vision models) and **Send**.

  * Streaming is saved to IndexedDB every \~250 ms, so you won’t lose context on refresh.
  * **Stop** cancels the request immediately (client `AbortController` → server `req.signal` → abort upstream).
* Chat titles auto-name from your first user message.
* Errors surface as toasts and inline status (e.g., missing API key, model not found, rate-limited, context too large).

---

## 4) Observability (Jaeger)

### Start

If you used `pnpm run dev:stack`, Jaeger is already up. Otherwise, run your own Jaeger v2 with OTLP HTTP (4318).



This app sends traces with useful attributes:

* `chat.model` – model id used
* `chat.last_message.text.content` – last user message (truncated)
* `chat.last_message.has_image` – whether the last message included an image
* Outbound `fetch` span to OpenRouter with `http.response.status_code`

---

### 1) Find a trace

1. Open Jaeger UI at [http://localhost:16686](http://localhost:16686).
2. In **Service**, choose **`madlen-web`**.
3. (Optional) Set **Lookback** to “Last 1 hour” and click **Find Traces**.
4. Send a message in the app, then refresh results.
   You’ll see traces named `POST` with a child operation `POST /api/chat/stream`.

---

### 2) Read the important spans

#### A) API route span (your server handler)

* Expand **`executing api route (app) /src/app/api/chat/stream/route`**.
* Open **Tags** and check:

  * `chat.model` – e.g., `mistralai/mistral-small-3.2-24b-instruct:free`
  * `chat.last_message.text.content` – last user text (truncated)
  * `chat.last_message.has_image` – `true|false`

#### B) Outbound OpenRouter call

* In the same trace, expand
  **`fetch POST https://openrouter.ai/api/v1/chat/completions`**.
* In **Tags**, verify:

  * `http.request.method` = `POST`
  * `http.response.status_code` = `200`, `404`, `429`, etc.
  * If an error occurred, the span shows **error = true**.

These two spans tell you which model was used, what the last user message was (and if it had an image), and whether the OpenRouter request succeeded.


---

### 5) Notes

* **Vision payload size:** we only include an image **when it’s the last user message** (no re-sending images from history). Consider client-side compression for large files, or a paid model.
* **Markdown vs raw text:** The default rendering option in this demo favors `react-markdown` for the output.
* **Free models:** we fetch `/api/v1/models` and filter on price/modality.
* **Tokenizing history:** Openrouter's API accepts raw text/image history messages. A service that enables us to send tokenized history would be quite beneficary for this project's scope, but requirement clearly states OpenRouter, hence the implementation.

---

## 6) Scripts

```json
 {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "dev:stack": "docker compose up --build",
    "dev:stack:down": "docker compose down",
    "dev:stack:logs": "docker compose logs -f web jaeger"
  }
```

Stop the stack:

```bash
pnpm dev:stack:down
```
- Or just control + C in the terminal, it will stop docker instances.