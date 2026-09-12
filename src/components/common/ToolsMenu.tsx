// src/components/common/ToolsMenu.tsx
//
// Single dropdown replacing what used to be separate icon buttons for
// each tool. Floats over the page rather than pushing content down - same
// interaction pattern as the group-chat "..." menu (an invisible
// full-screen layer to catch outside clicks, plus the actual panel
// positioned under the trigger) - just restyled in the Toolkit's own
// cream/gold palette instead of the app's dark slate theme, since that's
// where this menu actually lives.
//
// QR Code doesn't navigate directly - it opens a second floating panel
// (Generator/Scanner) right below it, since QR is really two destinations
// wearing one label.
//
// Used from three places: Focus Mode's top bar (entry point), and inside
// ToolkitPage/QRToolPage's own top bars, so switching tools never means
// going back to Focus Mode first.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Atom, Ruler, Sigma, QrCode, ChevronDown, QrCode as ScanIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ACCENT = '#C98A1D'
const TEXT = 'text-[#3A2E22]'

type ToolkitTool = 'ptable' | 'conversions' | 'formulas'

const TOOLKIT_ITEMS: { tool: ToolkitTool; label: string; icon: LucideIcon }[] = [
  { tool: 'ptable', label: 'Periodic Table', icon: Atom },
  { tool: 'conversions', label: 'Conversions', icon: Ruler },
  { tool: 'formulas', label: 'Formulas', icon: Sigma },
]

export default function ToolsMenu({ triggerClassName }: { triggerClassName: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const closeAll = () => { setOpen(false); setQrOpen(false) }
  const goToolkit = (tool: ToolkitTool) => { closeAll(); navigate(`/toolkit?tool=${tool}`) }
  const goQr = (mode: 'scan' | 'generate') => { closeAll(); navigate(`/qr?mode=${mode}`) }

  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen(o => !o)} className={triggerClassName} title="Toolkit">
        <Atom size={17} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={closeAll} />
          <div
            className="absolute right-0 top-full mt-2 z-[195] bg-white rounded-2xl py-2 w-56 shadow-lg border"
            style={{ borderColor: `${ACCENT}55` }}
          >
            {TOOLKIT_ITEMS.map(({ tool, label, icon: Icon }) => (
              <button
                key={tool}
                onClick={() => goToolkit(tool)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-left hover:bg-[#FDF3E2] transition-colors ${TEXT}`}
              >
                <Icon size={15} style={{ color: ACCENT }} />
                {label}
              </button>
            ))}

            {/* QR Code isn't one destination - it's two. Clicking it opens
                a second floating panel instead of navigating straight away. */}
            <div className="relative">
              <button
                onClick={() => setQrOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-sm font-semibold text-left hover:bg-[#FDF3E2] transition-colors ${TEXT}`}
              >
                <span className="flex items-center gap-2.5">
                  <QrCode size={15} style={{ color: ACCENT }} />
                  QR Code
                </span>
                <ChevronDown size={14} className={`transition-transform ${qrOpen ? 'rotate-180' : ''}`} style={{ color: ACCENT }} />
              </button>

              {qrOpen && (
                <div
                  className="mx-2 mt-1 mb-1 bg-[#FDF3E2] rounded-xl py-1.5 border"
                  style={{ borderColor: `${ACCENT}33` }}
                >
                  <button
                    onClick={() => goQr('generate')}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-left hover:bg-white/60 transition-colors ${TEXT}`}
                  >
                    <QrCode size={14} style={{ color: ACCENT }} />
                    Generator
                  </button>
                  <button
                    onClick={() => goQr('scan')}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-left hover:bg-white/60 transition-colors ${TEXT}`}
                  >
                    <ScanIcon size={14} style={{ color: ACCENT }} />
                    Scanner
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
