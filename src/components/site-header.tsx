import { BurberryWordmark } from "./burberry-wordmark";

/**
 * The masthead the replica was missing.
 *
 * The page previously carried nothing that identified the brand — no wordmark,
 * no chrome — which is most of why it read as a generic configurator. Measured
 * from us.burberry.com: 64px tall, opaque white, sticky, no bottom rule, with
 * the wordmark centred at 198x32.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-center bg-background">
      {/* 124x20 viewBox at 32px tall lands on the 198px width the brand uses. */}
      <BurberryWordmark className="h-8 w-[198px] text-ink" />
    </header>
  );
}
