# LLM Chrome Extension

An AI-powered Chrome extension that helps you chat with LLMs and summarize web pages with auto-highlighting.

## Features

1. **Chat with LLM** - Ask questions and get AI-powered answers
2. **Page Summarization** - Automatically summarize web pages and highlight key sections
3. **Multi-Provider Support** - Works with OpenAI, Anthropic, and custom OpenAI-compatible APIs

## Tech Stack

- React 18 with TypeScript
- Vite for building
- Chrome Extension Manifest V3
- Multiple LLM providers (OpenAI, Anthropic, Custom)

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Configuration

Open the extension's side panel and go to Settings to configure:

- **LLM Provider**: Choose between OpenAI, Anthropic, or Custom
- **API Key**: Enter your API key for the selected provider
- **Model**: Select the model to use
- **Base URL**: (Custom provider only) Enter the API base URL
- **Custom Prompts**: Customize prompts for different actions

## Usage

### Chat

1. Click the extension icon to open the side panel
2. Type your question in the input field
3. Get streaming responses from the AI

### Summarize Page

1. Navigate to any web page
2. Open the extension side panel
3. Click "Summarize Page"
4. View the summary and see highlighted sections on the page

## Project Structure

```
llm-chrome-extension/
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── background/            # Background service worker
│   ├── content/               # Content scripts
│   ├── sidepanel/             # React UI
│   └── shared/                # Shared types and utilities
├── vite.config.ts             # Vite configuration
└── package.json
```

## License

MIT
