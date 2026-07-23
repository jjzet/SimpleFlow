import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Shown on auth pages when no Supabase is configured (local-first mode).
export function LocalModeNotice() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        This SimpleFlow instance runs in local mode — no accounts needed. Your
        work is saved in your browser.
      </p>
      <Button asChild className="w-full">
        <Link href="/editor">Open the editor</Link>
      </Button>
    </div>
  );
}
