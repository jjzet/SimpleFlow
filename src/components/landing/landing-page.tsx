'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  History,
  Layers,
  Zap,
} from 'lucide-react';
import './landing.css';

gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin);

// Debugging aid: lets devtools drive/inspect animations in development.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as unknown as { gsap: typeof gsap }).gsap = gsap;
}

const GITHUB_URL = 'https://github.com/jjzet/SimpleFlow';

/* The JSON that "writes itself" beside the hero canvas. */
const codeLines: Array<Array<{ t: string; c?: string }>> = [
  [{ t: '{', c: 'tok-punc' }],
  [
    { t: '  "id": ', c: 'tok-key' },
    { t: '"order-approval"', c: 'tok-str' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '  "initialState": ', c: 'tok-key' },
    { t: '"draft"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [{ t: '  "states": [', c: 'tok-key' }],
  [
    { t: '    ', c: 'tok-punc' },
    { t: '"draft"', c: 'tok-state' },
    { t: ', ', c: 'tok-punc' },
    { t: '"inReview"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '    ', c: 'tok-punc' },
    { t: '"approved"', c: 'tok-state' },
    { t: ', ', c: 'tok-punc' },
    { t: '"rejected"', c: 'tok-state' },
  ],
  [{ t: '  ],', c: 'tok-punc' }],
  [{ t: '  "transitions": [', c: 'tok-key' }],
  [
    { t: '    { "from": ', c: 'tok-key' },
    { t: '"draft"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '      "to": ', c: 'tok-key' },
    { t: '"inReview"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '      "trigger": ', c: 'tok-key' },
    { t: '"submit"', c: 'tok-str' },
    { t: ' },', c: 'tok-punc' },
  ],
  [
    { t: '    { "from": ', c: 'tok-key' },
    { t: '"inReview"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '      "to": ', c: 'tok-key' },
    { t: '"approved"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '      "guard": ', c: 'tok-key' },
    { t: '"approvalsComplete"', c: 'tok-str' },
    { t: ' }', c: 'tok-punc' },
  ],
  [{ t: '  ],', c: 'tok-punc' }],
  [{ t: '  "actions": [', c: 'tok-key' }],
  [
    { t: '    { "onEnter": ', c: 'tok-key' },
    { t: '"approved"', c: 'tok-state' },
    { t: ',', c: 'tok-punc' },
  ],
  [
    { t: '      "runWorker": ', c: 'tok-key' },
    { t: '"notify-owner"', c: 'tok-str' },
    { t: ' }', c: 'tok-punc' },
  ],
  [{ t: '  ]', c: 'tok-punc' }],
  [{ t: '}', c: 'tok-punc' }],
];

const terminalLines = [
  { prompt: true, text: `git clone ${GITHUB_URL}.git` },
  { prompt: true, text: 'cd SimpleFlow && npm install' },
  { prompt: true, text: 'npm run dev' },
  {
    prompt: false,
    text: '  ➜  ready on http://localhost:3000 — no account, no database',
  },
];

const targets = [
  {
    tag: 'target · xstate@5',
    name: 'XState',
    body: "Export a working createMachine config for the JS ecosystem's favourite statechart runtime.",
    foot: '→ createMachine({ … })',
    chip: 'in progress',
    live: false,
  },
  {
    tag: 'target · lusid workflow',
    name: 'LUSID Workflow',
    body: "Task definitions, workers and event handlers as deployable LUSID Workflow JSON — SimpleFlow's original home turf.",
    foot: '→ PUT /workflow/taskdefinitions',
    chip: 'available',
    live: true,
  },
  {
    tag: 'target · your schema',
    name: 'Your own JSON',
    body: 'Map the same drawing onto whatever your engine expects with a declarative generator config.',
    foot: '→ generator.config.json',
    chip: 'in progress',
    live: false,
  },
];

const features = [
  {
    icon: Layers,
    title: 'Hierarchy that means something',
    body: 'Parent, child and exception tasks are real containers with their own states and schema — not decoration on a flat graph.',
  },
  {
    icon: Zap,
    title: 'Logic rides the edges',
    body: 'Triggers, guards and actions live on the transitions where they belong — the Mealy way.',
  },
  {
    icon: History,
    title: 'Versioned templates',
    body: 'Save whole machines as templates, tag them, and roll back to any earlier version.',
  },
  {
    icon: Code2,
    title: 'The code panel never lies',
    body: 'Generated output re-renders as you draw. Copy it straight out of the panel whenever you like.',
  },
];

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* — hero entrance — */
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro
          .from('.sf-nav', { yPercent: -120, autoAlpha: 0, duration: 0.6 })
          .from(
            '.sf-hero-tag',
            { y: 18, autoAlpha: 0, duration: 0.5 },
            '-=0.25'
          )
          .from(
            '.sf-hero-line > span',
            { yPercent: 115, duration: 0.9, stagger: 0.12, ease: 'power4.out' },
            '-=0.3'
          )
          .from(
            '.sf-hero-sub',
            { y: 22, autoAlpha: 0, duration: 0.6 },
            '-=0.45'
          )
          .from(
            '.sf-hero-ctas > *',
            { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.08 },
            '-=0.35'
          )
          .from(
            '.sf-hero-card',
            { y: 60, autoAlpha: 0, duration: 0.9, ease: 'power3.out' },
            '-=0.4'
          );

        /* — the machine assembles itself — */
        const machine = gsap.timeline({
          delay: 1.15,
          defaults: { ease: 'power2.out' },
        });
        machine
          .from('.sf-mc-container', {
            drawSVG: '0%',
            duration: 0.7,
            ease: 'none',
          })
          .from(
            '.sf-mc-container-tag',
            { autoAlpha: 0, duration: 0.3 },
            '-=0.2'
          )
          .from('.sf-mc-node', {
            scale: 0.55,
            autoAlpha: 0,
            transformOrigin: '50% 50%',
            duration: 0.45,
            stagger: 0.12,
            ease: 'back.out(1.8)',
          })
          .from(
            '.sf-mc-edge',
            { drawSVG: '0%', duration: 0.4, stagger: 0.22, ease: 'none' },
            '-=0.1'
          )
          /* the dashed action edge keeps its own dash pattern, so it fades
             in rather than being drawn (DrawSVG would overwrite the dashes) */
          .from('.sf-marching', { autoAlpha: 0, duration: 0.35 }, '-=0.2')
          .from(
            '.sf-mc-arrow',
            { autoAlpha: 0, duration: 0.2, stagger: 0.22 },
            '-=0.9'
          )
          .from(
            '.sf-mc-icon',
            {
              scale: 0,
              autoAlpha: 0,
              transformOrigin: '50% 50%',
              duration: 0.4,
              stagger: 0.15,
              ease: 'back.out(2.2)',
            },
            '-=0.5'
          )
          .from(
            '.sf-code-line',
            { autoAlpha: 0, x: -10, duration: 0.3, stagger: 0.05 },
            '-=1.2'
          );

        /* — idle life: marching action edge + a breathing review state — */
        gsap.to('.sf-marching', {
          strokeDashoffset: -24,
          duration: 1.6,
          ease: 'none',
          repeat: -1,
          delay: 3.4,
        });
        gsap.to('.sf-mc-pulse', {
          opacity: 0.25,
          duration: 1.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 3.4,
        });

        /* — scroll reveals — */
        gsap.utils.toArray<HTMLElement>('.sf-section').forEach((section) => {
          const items = section.querySelectorAll('.sf-reveal');
          if (!items.length) return;
          gsap.from(items, {
            y: 30,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: 'power2.out',
            scrollTrigger: { trigger: section, start: 'top 74%', once: true },
          });
        });

        /* — terminal types itself on arrival — */
        gsap.from('.sf-term-line', {
          autoAlpha: 0,
          y: 8,
          duration: 0.35,
          stagger: 0.4,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: '.sf-terminal',
            start: 'top 78%',
            once: true,
          },
        });
      });

      /* Reduced motion: everything simply present, no tweens. */
      mm.add('(prefers-reduced-motion: reduce)', () => {});
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="sf-landing min-h-screen">
      {/* ————— nav ————— */}
      <header className="sf-nav bg-[color:var(--paper)]/85 sticky top-0 z-40 border-b border-[color:var(--line)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="sf-display text-2xl leading-none">
            Simple
            <span className="italic text-[color:var(--accent)]">Flow</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href="#targets"
              className="sf-tag hidden transition-colors hover:text-[color:var(--ink)] sm:inline"
            >
              targets
            </a>
            <a
              href="#local-first"
              className="sf-tag hidden transition-colors hover:text-[color:var(--ink)] sm:inline"
            >
              local-first
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="sf-tag transition-colors hover:text-[color:var(--ink)]"
            >
              github
            </a>
            <Link
              href="/editor"
              className="sf-btn sf-btn--ink hidden text-sm sm:inline-flex"
            >
              Open the editor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ————— hero ————— */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <p className="sf-hero-tag sf-tag mb-7">
          open-source visual state machine designer
        </p>

        <h1 className="sf-display mx-auto max-w-4xl text-[clamp(2.9rem,7.5vw,5.6rem)] leading-[1.02]">
          <span className="sf-hero-line block overflow-hidden">
            <span className="block">Where state machines</span>
          </span>
          <span className="sf-hero-line block overflow-hidden">
            <span className="block">
              take <span className="sf-flourish">shape.</span>
            </span>
          </span>
        </h1>

        <p className="sf-hero-sub mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-[color:var(--ink-soft)]">
          Draw hierarchical states, transitions, guards and triggers on a canvas
          that feels crafted — then export exactly the JSON your runtime speaks.
        </p>

        <div className="sf-hero-ctas mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link href="/editor" className="sf-btn sf-btn--ink">
            Open the editor
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="sf-btn sf-btn--ghost"
          >
            View on GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <p className="sf-hero-ctas sf-tag mt-6">
          mit licence · local-first · self-hosted
        </p>

        {/* ————— hero canvas card ————— */}
        <div className="sf-hero-card sf-frame mx-auto mt-16 max-w-5xl overflow-hidden text-left">
          <div className="sf-titlebar">
            <div className="sf-titlebar-dots">
              <span />
              <span />
              <span />
            </div>
            <span className="sf-tag !text-xs">
              simpleflow — order-approval.flow
            </span>
          </div>

          <div className="grid lg:grid-cols-[1.45fr,1fr]">
            {/* canvas pane */}
            <div className="relative flex items-center border-b border-[color:var(--line)] p-4 lg:border-b-0 lg:border-r">
              <HeroMachine />
            </div>

            {/* code pane */}
            <div className="sf-ink-panel p-5">
              <p className="sf-code-line tok-comment mb-3">
                {'// generated as you draw'}
              </p>
              {codeLines.map((line, i) => (
                <div key={i} className="sf-code-line whitespace-pre">
                  {line.map((seg, j) => (
                    <span key={j} className={seg.c}>
                      {seg.t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="sf-tag mt-6">
          the canvas and the code panel stay in lockstep
        </p>
      </section>

      {/* ————— targets ————— */}
      <section
        id="targets"
        className="sf-section mx-auto max-w-6xl scroll-mt-24 px-6 py-24"
      >
        <p className="sf-reveal sf-tag mb-4">generators</p>
        <h2 className="sf-reveal sf-display max-w-2xl text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.05]">
          Draw it once. <span className="sf-flourish">Target</span> anything.
        </h2>
        <p className="sf-reveal mt-5 max-w-xl text-[color:var(--ink-soft)]">
          A generator turns the same drawing into the format your platform runs.
          Pick one that exists, or write the one you need.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {targets.map((target) => (
            <div key={target.name} className="sf-reveal sf-card flex flex-col">
              <p className="sf-tag !text-[0.7rem]">{target.tag}</p>
              <h3 className="sf-display mt-4 text-2xl">{target.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                {target.body}
              </p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <code
                  className="truncate text-xs text-[color:var(--ink-faint)]"
                  style={{ fontFamily: 'var(--font-code)' }}
                >
                  {target.foot}
                </code>
                <span
                  className={`sf-chip ${target.live ? 'sf-chip--live' : 'sf-chip--soon'}`}
                >
                  {target.chip}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ————— local-first ————— */}
      <section
        id="local-first"
        className="sf-section mx-auto max-w-6xl scroll-mt-24 px-6 py-24"
      >
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="sf-reveal sf-tag mb-4">self-hosted</p>
            <h2 className="sf-reveal sf-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.05]">
              Local-first, in the <span className="sf-flourish">honest</span>{' '}
              sense.
            </h2>
            <p className="sf-reveal mt-5 max-w-lg leading-relaxed text-[color:var(--ink-soft)]">
              Clone it and it runs. No account wall, no database to stand up, no
              telemetry. Machines persist in your browser and export as JSON
              files. Postgres and authentication are there when you want the
              hosted, multi-user mode — not before.
            </p>
            <div className="sf-reveal mt-8">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="sf-btn sf-btn--ghost"
              >
                Read the setup guide
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="sf-reveal sf-frame sf-terminal overflow-hidden">
            <div className="sf-titlebar">
              <div className="sf-titlebar-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="sf-tag !text-xs">zsh</span>
            </div>
            <div className="sf-ink-panel p-5 text-[0.82rem]">
              {terminalLines.map((line, i) => (
                <div
                  key={i}
                  className="sf-term-line whitespace-pre-wrap leading-loose"
                >
                  {line.prompt ? <span className="tok-str">$ </span> : null}
                  <span className={line.prompt ? 'tok-key' : 'tok-comment'}>
                    {line.text}
                  </span>
                </div>
              ))}
              <div className="sf-term-line leading-loose">
                <span className="tok-str">$ </span>
                <span className="sf-cursor" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ————— features ————— */}
      <section className="sf-section mx-auto max-w-6xl px-6 py-24">
        <p className="sf-reveal sf-tag mb-4">the craft</p>
        <h2 className="sf-reveal sf-display max-w-2xl text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.05]">
          Small tool, <span className="sf-flourish">serious</span> machinery.
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="sf-reveal sf-card">
              <feature.icon
                className="h-5 w-5 text-[color:var(--accent)]"
                strokeWidth={1.75}
              />
              <h3 className="sf-display mt-4 text-xl">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ————— the story ————— */}
      <section className="sf-section mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="sf-reveal sf-tag mb-6">the story</p>
        <p className="sf-reveal sf-display text-[clamp(1.5rem,3vw,2.2rem)] leading-snug">
          SimpleFlow began as a workflow designer for one financial-data
          platform. It&apos;s becoming the state machine canvas for{' '}
          <span className="sf-flourish">any</span> of them.
        </p>
        <div className="sf-reveal mt-8">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="sf-tag transition-colors hover:text-[color:var(--ink)]"
          >
            follow along on github ↗
          </a>
        </div>
      </section>

      {/* ————— footer ————— */}
      <footer className="border-t border-[color:var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10">
          <div className="flex items-baseline gap-4">
            <span className="sf-display text-xl">
              Simple
              <span className="italic text-[color:var(--accent)]">Flow</span>
            </span>
            <span className="sf-tag !text-xs">
              mit licence · © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/editor"
              className="sf-tag transition-colors hover:text-[color:var(--ink)]"
            >
              editor
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="sf-tag transition-colors hover:text-[color:var(--ink)]"
            >
              github
            </a>
            <span className="sf-tag hidden !text-xs sm:inline">
              made in london
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
   The hero's state machine, hand-drawn SVG. Class names are GSAP hooks:
   sf-mc-container, sf-mc-node, sf-mc-edge, sf-mc-arrow, sf-mc-icon.
   ———————————————————————————————————————————————————————————————— */
function HeroMachine() {
  return (
    <svg
      viewBox="0 0 620 330"
      className="sf-canvas-svg h-auto w-full"
      role="img"
      aria-label="A SimpleFlow canvas showing an order approval state machine: draft, in review, approved and rejected states with a trigger, a guard and a worker."
    >
      {/* parent task container */}
      <rect
        className="sf-mc-container"
        x="30"
        y="34"
        width="560"
        height="262"
        rx="14"
        fill="rgba(217, 154, 43, 0.05)"
        stroke="var(--hue-parent)"
        strokeWidth="1.5"
        strokeDasharray="7 6"
      />
      <g className="sf-mc-container-tag">
        <rect
          x="46"
          y="24"
          width="172"
          height="21"
          rx="10.5"
          fill="var(--paper-raised)"
          stroke="var(--hue-parent)"
          strokeWidth="1"
        />
        <text x="58" y="38" fontSize="11" fill="var(--ink-soft)">
          order-approval · parent
        </text>
      </g>

      {/* ——— edges (drawn before nodes in DOM so nodes sit on top) ——— */}
      <path
        className="sf-mc-edge"
        d="M190 112 L246 112"
        stroke="var(--ink-soft)"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        className="sf-mc-edge"
        d="M370 112 L436 112"
        stroke="var(--ink-soft)"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        className="sf-mc-edge"
        d="M310 134 L310 206"
        stroke="var(--ink-soft)"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        className="sf-marching"
        d="M500 134 L500 206"
        stroke="var(--hue-worker)"
        strokeWidth="1.6"
        fill="none"
      />

      {/* arrowheads */}
      <polygon
        className="sf-mc-arrow"
        points="246,107 246,117 255,112"
        fill="var(--ink-soft)"
      />
      <polygon
        className="sf-mc-arrow"
        points="436,107 436,117 445,112"
        fill="var(--ink-soft)"
      />
      <polygon
        className="sf-mc-arrow"
        points="305,206 315,206 310,215"
        fill="var(--ink-soft)"
      />
      <polygon
        className="sf-mc-arrow"
        points="495,206 505,206 500,215"
        fill="var(--hue-worker)"
      />

      {/* ——— states ——— */}
      {/* Draft (initial) */}
      <g className="sf-mc-node">
        <rect
          x="70"
          y="90"
          width="120"
          height="44"
          rx="10"
          fill="#eef3fd"
          stroke="var(--hue-state)"
          strokeWidth="1.5"
        />
        <path
          d="M84 101 v22 M84 101 h10 l-3 4 3 4 h-10"
          stroke="var(--hue-state)"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="102" y="116" fontSize="12.5" fill="var(--ink)">
          Draft
        </text>
      </g>

      {/* In review */}
      <g className="sf-mc-node">
        <rect
          className="sf-mc-pulse"
          x="250"
          y="90"
          width="120"
          height="44"
          rx="10"
          fill="var(--hue-state)"
          opacity="0.12"
        />
        <rect
          x="250"
          y="90"
          width="120"
          height="44"
          rx="10"
          fill="none"
          stroke="var(--hue-state)"
          strokeWidth="1.5"
        />
        <text
          x="310"
          y="116"
          fontSize="12.5"
          fill="var(--ink)"
          textAnchor="middle"
        >
          In review
        </text>
      </g>

      {/* Approved */}
      <g className="sf-mc-node">
        <rect
          x="440"
          y="90"
          width="120"
          height="44"
          rx="10"
          fill="#eef3fd"
          stroke="var(--hue-state)"
          strokeWidth="1.5"
        />
        <text
          x="500"
          y="116"
          fontSize="12.5"
          fill="var(--ink)"
          textAnchor="middle"
        >
          Approved
        </text>
      </g>

      {/* Rejected (exception) */}
      <g className="sf-mc-node">
        <rect
          x="250"
          y="210"
          width="120"
          height="44"
          rx="10"
          fill="#fdf0ef"
          stroke="var(--hue-exception)"
          strokeWidth="1.5"
        />
        <text
          x="310"
          y="236"
          fontSize="12.5"
          fill="var(--ink)"
          textAnchor="middle"
        >
          Rejected
        </text>
      </g>

      {/* Worker chip */}
      <g className="sf-mc-node">
        <rect
          x="440"
          y="210"
          width="120"
          height="44"
          rx="10"
          fill="#f6effd"
          stroke="var(--hue-worker)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <text
          x="500"
          y="228"
          fontSize="11.5"
          fill="var(--ink)"
          textAnchor="middle"
        >
          notify-owner
        </text>
        <text
          x="500"
          y="243"
          fontSize="9.5"
          fill="var(--ink-faint)"
          textAnchor="middle"
        >
          worker
        </text>
      </g>

      {/* ——— trigger bolt on Draft → In review ——— */}
      <g className="sf-mc-icon">
        <circle
          cx="218"
          cy="112"
          r="11"
          fill="var(--paper-raised)"
          stroke="var(--hue-parent)"
          strokeWidth="1.3"
        />
        <path
          d="M219.5 105.5 l-5 7.5 h4 l-2 6 6.5 -8 h-4.5 z"
          fill="var(--hue-parent)"
        />
        <text
          x="218"
          y="141"
          fontSize="10"
          fill="var(--ink-faint)"
          textAnchor="middle"
        >
          submit
        </text>
      </g>

      {/* ——— guard shield on In review → Approved ——— */}
      <g className="sf-mc-icon">
        <circle
          cx="403"
          cy="112"
          r="11"
          fill="var(--paper-raised)"
          stroke="var(--hue-exception)"
          strokeWidth="1.3"
        />
        <path
          d="M403 105.5 l5 2 v4 c0 3.2 -2.2 5.4 -5 6.5 c-2.8 -1.1 -5 -3.3 -5 -6.5 v-4 z"
          fill="none"
          stroke="var(--hue-exception)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <text
          x="403"
          y="141"
          fontSize="10"
          fill="var(--ink-faint)"
          textAnchor="middle"
        >
          guard
        </text>
      </g>

      {/* trigger label on the reject edge */}
      <g className="sf-mc-icon">
        <rect
          x="322"
          y="160"
          width="52"
          height="18"
          rx="9"
          fill="var(--paper-raised)"
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <text
          x="348"
          y="172.5"
          fontSize="9.5"
          fill="var(--ink-soft)"
          textAnchor="middle"
        >
          reject
        </text>
      </g>

      {/* action label on the worker edge */}
      <g className="sf-mc-icon">
        <rect
          x="512"
          y="160"
          width="72"
          height="18"
          rx="9"
          fill="var(--paper-raised)"
          stroke="var(--hue-worker)"
          strokeWidth="1"
        />
        <text
          x="548"
          y="172.5"
          fontSize="9.5"
          fill="var(--hue-worker)"
          textAnchor="middle"
        >
          run worker
        </text>
      </g>
    </svg>
  );
}
