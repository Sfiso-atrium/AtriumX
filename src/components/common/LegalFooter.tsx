// src/components/common/LegalFooter.tsx
export default function LegalFooter() {
  return (
    <footer className="max-w-3xl mx-auto px-6 py-8 text-center">
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
