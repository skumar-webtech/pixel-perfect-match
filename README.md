# Argument Translator Web

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4653c5cd-5cd6-4e80-a5f7-55c55e2b68a0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Live translation

Live typing is broadcast through Supabase Realtime. After typing pauses briefly,
the app sends the text and selected language pair to Groq for translation. Add
your Groq API key to the local server environment (for example, `.env.local`):

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

`GROQ_MODEL` is optional. Restart the development server after setting these
variables. The key is read by the server-side translation function and must not
be renamed to a `NEXT_PUBLIC_` or `VITE_` variable. Conversation text is sent to
Groq for translation; it is not stored by this app.
