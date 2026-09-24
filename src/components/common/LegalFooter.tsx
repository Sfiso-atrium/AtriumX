// src/components/common/LegalFooter.tsx
//
// The bottom padding follows the real size of BottomNav: BottomNav measures
// how much room it takes from the bottom of the screen (its height plus the
// gap it floats above the edge and any phone safe area) and publishes it as
// --bottom-nav-space. The footer keeps that much clear plus a little extra,
// so the last line can never end up underneath the nav, whatever the screen.
// Pages with no BottomNav (like sign-in) fall back to the original 6rem.
export default function LegalFooter() {
  return (
    <footer className="max-w-3xl mx-auto px-6 pt-8 pb-[max(6rem,calc(var(--bottom-nav-space,0px)+1.5rem))] text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs mb-4">
        <a href="/How-it-works.html" className="text-cream-muted hover:text-teal-light transition-colors">How It Works</a>
        <a href="/Faq.html" className="text-cream-muted hover:text-teal-light transition-colors">FAQ</a>
        <a href="/safety.html" className="text-cream-muted hover:text-teal-light transition-colors">Safety Tips</a>
        <a href="/Terms.html" className="text-cream-muted hover:text-teal-light transition-colors">Terms of Service</a>
        <a href="/Privacy.html" className="text-cream-muted hover:text-teal-light transition-colors">Privacy Policy</a>
      </div>
       <p className="text-cream-muted text-xs">&copy; AtriumX | Built for campus communities</p>
    </footer>
  )
}
