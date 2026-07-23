# SimpleFlow

**An open-source visual designer for hierarchical state machines.**

Draw states, transitions, guards and triggers on a crafted canvas — then export exactly the JSON your runtime speaks. Local-first, self-hosted, MIT.

## Why SimpleFlow?

Most workflow tools give you a diagram. SimpleFlow gives you a **deployable definition**: the canvas and the code panel stay in lockstep, so what you draw is always what you ship.

- **Hierarchy that means something** — parent, child and exception tasks are real containers with their own states and field schema, not decoration on a flat graph.
- **Logic rides the edges** — triggers, guards and actions live on the transitions where they belong (the Mealy way).
- **Versioned templates** — save whole machines as templates, tag them, and roll back to any earlier version.
- **The code panel never lies** — generated output re-renders as you draw; copy it out whenever you like.

## Targets

A _generator_ turns the same drawing into the format your platform runs:

| Target                                                                                                                       | Status         |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **LUSID Workflow** — task definitions, workers and event handlers as deployable [LUSID](https://www.lusid.com) Workflow JSON | ✅ available   |
| **XState v5** — a working `createMachine` config                                                                             | 🚧 in progress |
| **Your own JSON** — declarative generator config mapping the canvas to your schema                                           | 🚧 in progress |

## Quick start

```bash
git clone https://github.com/jjzet/SimpleFlow.git
cd SimpleFlow
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's it — **no account, no database, no telemetry**. Your machines persist in your browser and export as JSON.

## Hosted mode (optional)

SimpleFlow is local-first, but it can run as a hosted, multi-user instance backed by [Supabase](https://supabase.com) (Postgres + auth). Copy `.env.local.example` to `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

With these present, the app enables accounts, shared templates and version history in Postgres. Without them, everything runs locally.

Optional extras:

- `ANTHROPIC_API_KEY` — enables the built-in AI assistant.
- A LUSID environment URL + credentials (entered in the app's settings) — enables one-click deployment for the LUSID target.

## Tech

Next.js 14 · TypeScript · React Flow · Tailwind CSS · shadcn/ui · GSAP

### A note on fonts

The landing page's display stack is `'Tiempos Headline', 'Instrument Serif', Georgia, serif`. [Tiempos](https://klim.co.nz/retail-fonts/tiempos-headline/) is a commercial face and is **not** included in this repository; visitors see the free Instrument Serif unless licensed Tiempos web fonts are installed at the deployment.

## Development

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run format` — Prettier

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching conventions.

## The story

SimpleFlow began life as a workflow designer for one financial-data platform. It's becoming the state machine canvas for any of them — follow along, open an issue, or star the repo if that's a future you'd use.

## License

[MIT](LICENSE)
