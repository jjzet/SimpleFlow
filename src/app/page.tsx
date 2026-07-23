import type { Metadata } from 'next';
import {
  Instrument_Serif,
  Schibsted_Grotesk,
  Spline_Sans_Mono,
} from 'next/font/google';
import { LandingPage } from '@/components/landing/landing-page';

// Display stack: Tiempos Headline renders for anyone with it installed
// (see README — drop licensed woff2s in later for visitors); Instrument
// Serif is the free fallback everyone else sees.
const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
});

const grotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
});

const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'SimpleFlow — the open-source visual state machine designer',
  description:
    'Draw hierarchical states, transitions, guards and triggers on a crafted canvas, then export exactly the JSON your runtime speaks. Local-first, self-hosted, MIT.',
};

export default function Home() {
  return (
    <div className={`${serif.variable} ${grotesk.variable} ${mono.variable}`}>
      <LandingPage />
    </div>
  );
}
