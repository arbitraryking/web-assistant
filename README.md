# PagePilot

An AI-powered Chrome extension that brings ChatGPT/Claude-like capabilities to your browsing experience. Chat with AI, summarize web pages with auto-highlighting, and ask questions about selected text - all without leaving your current page.

## ✨ Features

### 🤖 AI Chat
- **Streaming responses** - Watch the AI answer in real-time, just like ChatGPT
- **Multi-provider support** - Works with OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), and custom OpenAI-compatible APIs
- **Chat history** - Full conversation context maintained across sessions

### 📝 Page Summarization
- **One-click summaries** - Get instant AI-generated summaries of any web page
- **Auto-highlighting** - Key sections are automatically highlighted on the page with clickable links
- **Structured output** - Overview panel with expandable section cards
- **Progress tracking** - Visual feedback during summarization (extracting → generating → highlighting)

### 💬 Contextual Questions (New!)
- **Floating button** - Select any text on a webpage to see an "Ask AI" button
- **Context cards** - Selected text appears as context cards in your chat
- **Smart detection** - Automatically detects if side panel is open or closed
- **Two input methods**:
  1. **Context menu**: Right-click selected text → "Ask AI about this"
  2. **Floating button**: Select text → Click floating "💬 Ask about this" button

### 🔧 Highly Customizable
- **Custom prompts** - Tailor AI behavior for chat and summarization
- **Multiple models** - Switch between different AI models easily
- **Custom API endpoints** - Use any OpenAI-compatible API

## 🎬 Quick Demo

### Scenario 1: Researching a Long Article

You're reading a lengthy article about machine learning and want to understand the key points quickly.

1. Open the article in Chrome
2. Click the extension icon to open the side panel
3. Click **"Summarize Page"**
4. Watch as the extension:
   - Extracts the page content
   - Generates an AI summary
   - Highlights key sections directly on the page
5. Click any section card to jump to that part of the article

### Scenario 2: Asking About Selected Text

You're reading a technical document and don't understand a specific paragraph.

1. **Select the text** you want to understand
2. Click the **"💬 Ask about this"** floating button that appears
3. Type your question: *"Explain this in simpler terms"*
4. The AI uses your selected text as context to answer

### Scenario 3: Quick Q&A While Browsing

You're browsing a documentation site and have a quick question.

1. **Select any text** on the page
2. **Right-click** → **"Ask AI about this"**
3. The extension opens automatically with your text loaded
4. Ask your question and get an instant answer

## 🚀 Getting Started

### Installation

#### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/llm-chrome-extension.git
cd llm-chrome-extension

# Install dependencies
pnpm install

# Build the extension
pnpm run build
```

#### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** in the top right
3. Click **"Load unpacked"**
4. Select the `dist` folder from this project
5. Click the extension icon to open the side panel

### First-Time Setup

1. **Open Settings** (click the gear icon in the side panel)
2. **Choose your LLM provider**:
   - **OpenAI**: Enter your API key (get one at platform.openai.com)
   - **Anthropic**: Enter your API key (get one at console.anthropic.com)
   - **Custom**: Enter your API base URL and key
3. **Select a model** (e.g., GPT-4, Claude 3.5, etc.)
4. **Save** your settings

## 📖 Usage Guide

### Chat Interface

```
┌─────────────────────────────────────┐
│  PagePilot                      ⚙️  │
├─────────────────────────────────────┤
│                                     │
│  💬 Ask questions and get answers  │
│                                     │
│  [Summarize Page]                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Context Cards (if any)       │   │
│  │ 📄 Selected: "...text..."  │   │
│  │                    [×]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Chat Messages                │   │
│  │                              │   │
│  │ 👤 You: What is React?       │   │
│  │                              │   │
│  │ 🤖 AI: React is a...        │   │
│  │                              │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Type your question...]      [Send]│
└─────────────────────────────────────┘
```

### Summarization Flow

```
┌─────────────────────────────────────┐
│  Progress                           │
│  ⏳ Extracting page content...      │
│  ▓▓▓▓▓▓▓▓▓░░░░░░ 80%               │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  📋 Summary                         │
│                                     │
│  Overview:                          │
│  This article discusses...          │
│                                     │
│  Key Sections:                      │
│  ┌─────────────────────────────┐   │
│  │ 1. Introduction          [→]│   │
│  │    Brief overview of...      │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 2. Main Concepts         [→]│   │
│  │    Deep dive into...         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Keyboard Shortcuts (Coming Soon)

- `Ctrl/Cmd + Shift + K` - Open side panel
- `Ctrl/Cmd + Shift + S` - Summarize current page
- `Esc` - Close side panel

## 🏗️ Architecture

This is a Manifest V3 Chrome extension with three isolated contexts:

```
┌─────────────┐     messages     ┌──────────────┐
│ Side Panel  │ ←──────────────→ │    Background│
│  (React)    │                  │  Service     │
└─────────────┘                  │  Worker      │
                                 └──────┬───────┘
                                        │
                                        ↓ messages
                                 ┌──────────────┐
                                 │ Content      │
                                 │ Script       │
                                 │ (per page)   │
                                 └──────────────┘
```

- **Side Panel**: React UI for chat, settings, and displaying results
- **Background Service Worker**: Message routing, LLM API calls, storage management
- **Content Scripts**: Page content extraction, highlighting, text selection UI

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm run dev

# Build for production
pnpm run build

# Load extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked"
# Select the `dist` folder
```

### Project Structure

```
src/
├── background/         # Service worker (message routing, LLM calls)
│   ├── index.ts        # Provider registration, context menu setup
│   ├── messageHandler.ts  # Central message router
│   ├── llmService.ts   # LLM provider registry
│   ├── storageService.ts  # Settings & chat history persistence
│   └── *Provider.ts    # OpenAI, Anthropic, Custom providers
├── content/            # Injected into web pages
│   ├── index.ts        # Main content script, text selection handler
│   ├── contentExtractor.ts  # Page content extraction
│   └── highlighter.ts  # Fuzzy text matching & highlighting
├── sidepanel/          # React UI
│   ├── App.tsx         # Main app with tab navigation
│   ├── hooks/
│   │   ├── useChat.ts  # Chat state & message handling
│   │   └── useSettings.ts  # Settings management
│   ├── pages/
│   │   ├── Chat.tsx    # Chat interface
│   │   └── Settings.tsx  # Settings configuration
│   └── styles/
│       └── global.css  # Side panel styles
├── popup/              # Extension popup (for opening side panel)
│   ├── popup.html
│   └── popup.ts
└── shared/             # Shared types & utilities
    ├── types/
    │   ├── messages.ts # Message type definitions
    │   └── settings.ts # Settings interfaces & defaults
    └── constants.ts    # Storage keys, highlight colors
```

## 🔑 Configuration Options

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Provider** | LLM provider (OpenAI/Anthropic/Custom) | OpenAI |
| **API Key** | Your API key for the provider | - |
| **Model** | AI model to use | gpt-3.5-turbo |
| **Base URL** | Custom API endpoint (Custom provider only) | - |
| **Chat Prompt** | System prompt for chat conversations | "You are a helpful assistant..." |
| **Summarize Prompt** | Prompt for page summarization | Custom JSON-structured prompt |

### Custom Prompts

You can customize how the AI behaves by editing prompts in Settings:

**Chat Prompt Example:**
```
You are a technical expert. Provide detailed, accurate answers
with code examples when relevant. Always explain your reasoning.
```

**Summarize Prompt Example:**
```
Summarize this web page in JSON format:
{
  "overview": "2-3 sentence overview",
  "sections": [
    {
      "title": "Section name",
      "summary": "Brief summary",
      "textSnippet": "First 20 words from section"
    }
  ]
}
```

## 🐛 Troubleshooting

### Extension not loading
- Make sure you've built the project: `pnpm run build`
- Check for errors in `chrome://extensions/`
- Try removing and re-loading the extension

### API errors
- Verify your API key is correct
- Check that you have sufficient credits/quota
- Ensure you selected the right model for your provider

### Summarization not working
- Some pages block content extraction (Chrome settings pages, etc.)
- Try on a regular article or blog post
- Check the console for error messages

### Text selection button not appearing
- Make sure you've selected at least 5 characters
- Try refreshing the page
- Check that the content script has loaded (see extension errors)

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Uses [`@mozilla/readability`](https://github.com/mozilla/readability) for content extraction
- Inspired by ChatGPT and Claude's conversational interfaces
- Built with React, TypeScript, and Vite
