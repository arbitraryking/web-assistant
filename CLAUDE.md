# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

This project uses **pnpm** as the package manager (see `pnpm-lock.yaml`), though `package.json` scripts work with any runner.

```bash
pnpm install          # Install dependencies
pnpm run build        # Type-check (tsc) then bundle (vite build) -> outputs to dist/
pnpm run dev          # Vite dev server (note: Chrome extensions need special handling in dev)
pnpm run preview      # Preview production build
```

After building, load the extension in Chrome: `chrome://extensions/` -> Developer mode -> Load unpacked -> select `dist/`.

To reload after code changes: rebuild, then click the refresh icon on the extension card in `chrome://extensions/`.

There are no automated tests. Manual testing steps are in `TESTING.md`.

## Architecture Overview

Chrome Extension Manifest V3 with three isolated contexts that communicate exclusively via `chrome.runtime` message passing:

```
Side Panel (React UI)  <-->  Service Worker (Background)  <-->  Content Script (injected per-page)
  src/sidepanel/               src/background/                  src/content/
```

### Side Panel (`src/sidepanel/`)
React 18 app. Two pages: `Chat` and `Settings`, switched via tab navigation in `App.tsx`. State is managed via custom hooks (`useChat`, `useSettings`) that send messages to the background and listen for responses via `chrome.runtime.onMessage`.

### Service Worker (`src/background/`)
The central hub. `index.ts` registers providers and sets up the single `chrome.runtime.onMessage` listener, which delegates everything to `MessageHandler`. Key responsibilities:
- **`messageHandler.ts`** — Routes all message types. Handles chat streaming, page summarization (orchestrates content extraction -> LLM call -> highlight extraction -> highlight injection), settings CRUD. The `handle()` method returns `true` for async message flows to keep the message channel open.
- **`llmService.ts`** — Provider registry pattern. Providers implement the `LLMProvider` interface (`chat` as an `AsyncGenerator<string>`, `validateConfig`). Registered at startup in `index.ts`.
- **`storageService.ts`** — Wraps `chrome.storage.sync` (settings) and `chrome.storage.local` (chat history). Includes settings validation logic.
- **Provider files** (`openaiProvider.ts`, `anthropicProvider.ts`, `customProvider.ts`) — Each uses raw `fetch` + manual SSE parsing (not SDKs) because the OpenAI/Anthropic SDKs don't work well in service workers. All three follow the same pattern: validate, fetch with `stream: true`, read SSE chunks via `ReadableStream`, yield text deltas.
- **Keep-alive** — `startKeepAlive()`/`stopKeepAlive()` in `index.ts` run a `setInterval` ping during active streams to prevent the service worker from being terminated by Chrome.

### Content Script (`src/content/`)
Injected into every page. Listens for messages from the background:
- `GET_PAGE_CONTENT` — Extracts page text via `@mozilla/readability` (`contentExtractor.ts`), with fallback selectors if Readability fails.
- `HIGHLIGHT_CONTENT` — Creates absolutely-positioned overlay `div`s over target elements found by text snippet (via TreeWalker), CSS selector, or XPath (`highlighter.ts`). Overlays update position on scroll/resize and auto-remove after a configurable duration.
- If the content script isn't loaded when the background needs it, `messageHandler.ensureContentScriptLoaded()` injects it via `chrome.scripting.executeScript`.

### Shared (`src/shared/`)
- **`types/messages.ts`** — The `MessageType` enum and all message/request/response interfaces. Also has type guard functions (`isChatMessage`, etc.) used in the message handler switch.
- **`types/settings.ts`** — `Settings` interface, `PROVIDER_CONFIGS` (available models per provider), and `DEFAULT_SETTINGS` (includes the default summarization prompt which instructs the LLM to return JSON).
- **`constants.ts`** — `STORAGE_KEYS` and highlight color presets.

## Message Flow Patterns

**Chat:** Side panel sends `CHAT_MESSAGE` with the full message history. Background streams `STREAM_CHUNK` messages back (one per SSE delta) until it sends `STREAM_COMPLETE`. The `useChat` hook accumulates chunks into `streamingMessage` state and finalizes into a message on completion.

**Summarization:** Side panel sends `SUMMARIZE_PAGE`. Background pings the content script (injecting it if needed), sends `GET_PAGE_CONTENT`, gets the extracted text back, streams the LLM summary the same way as chat, then parses highlights out of the completed response and sends `HIGHLIGHT_CONTENT` to the content script. Highlight parsing tries JSON first (matching the structured format in `DEFAULT_SETTINGS.customPrompts.summarize`), then falls back to regex-matching quoted strings against the page content.

**Settings:** Simple request/response — `GET_SETTINGS` / `SAVE_SETTINGS` — no streaming involved.

## Key Implementation Details

- **Providers read the API key from `chrome.storage.sync` directly** (not from the `params` passed to `chat()`). The key is stored under `llm_assistant_settings.apiKey`.
- **Anthropic provider separates system messages** from the messages array before sending — Anthropic's API takes `system` as a top-level parameter, not in the messages list.
- **Custom provider appends `/chat/completions`** to the base URL if not already present, making it compatible with any OpenAI-compatible endpoint.
- **`storageService.validateSettings()`** enforces HTTPS for custom provider base URLs, but `customProvider.validateConfig()` allows HTTP too — these are inconsistent.
- **Highlight overlays use `position: absolute`** relative to the document, not the target element. They listen for `scroll` and `resize` events to stay in sync. The `duration` field on each highlight instruction triggers a `setTimeout` that calls `clearHighlights()` on the *entire* set — so all highlights share the first instruction's timeout.
- **`useChat` has a stale closure bug**: the `STREAM_COMPLETE` handler reads `streamingMessage` from the closure captured when the effect ran, not the latest accumulated value. The effect re-runs on `streamingMessage` changes as a workaround but this is fragile.

## Adding a New LLM Provider

1. Create `src/background/<name>Provider.ts` implementing the `LLMProvider` interface from `llmService.ts`.
2. Register it in `src/background/index.ts` via `llmService.registerProvider(...)`.
3. Add the provider option to the `LLMProvider` type union in `src/shared/types/settings.ts` and populate `PROVIDER_CONFIGS` with its models.
4. The Settings UI will pick it up automatically from `PROVIDER_CONFIGS`.
