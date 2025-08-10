# LLM Cross Referencer

Compare responses from multiple AI models side-by-side in real time.

## Demo

https://github.com/user-attachments/assets/demo.mp4

## Features

- **Compare 4 AI models**: OpenAI GPT, Anthropic Claude, Google Gemini, and Cohere Command
- **Real-time streaming**: See responses as they generate
- **Automatic summary**: AI-powered comparison of all responses
- **Privacy-first**: Your API keys are stored locally, never on our servers
- **Open source**: Full transparency and community-driven

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)
5. Click settings to add your API keys
6. Start comparing AI responses!

## API Keys

Add your own API keys through the settings menu:
- OpenAI API key
- Anthropic API key  
- Google AI API key
- Cohere API key

Only models with API keys will appear in the interface.

## Environment Variables (Optional)

Create `.env.local` for server-side keys:

```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
COHERE_API_KEY=your_cohere_key
```

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## Privacy

Your data is never stored. API keys remain in your browser and are sent directly to AI providers.

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Made by [Lucas Liao](https://x.com/liao_lucas) • [Open source on GitHub](https://github.com/lucasliao0403/llm-cross-referencer) • 2025