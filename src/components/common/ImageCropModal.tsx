// src/components/common/ImageCropModal.tsx
import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image.'))
    img.src = src
  })
}

// Renders the selected crop region onto a fixed-size canvas and exports it
// as a JPEG blob. Output is always exactly `aspect`, so downstream code
// never needs to re-check or reject an image's shape — the crop guarantees it.
async function getCroppedImageBlob(imageSrc: string, cropPixels: Area, outputWidth = 1200): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const outputHeight = Math.round(outputWidth * (cropPixels.height / cropPixels.width))
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported on this device.')

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, outputWidth, outputHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Could not export cropped image.'))),
      'image/jpeg',
      0.9
    )
  })
}

interface ImageCropModalProps {
  imageSrc: string
  aspect?: number
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export default function ImageCropModal({ imageSrc, aspect = 16 / 9, onCancel, onConfirm }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    setError('')
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } catch {
      setError('Could not process that crop. Try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-4">
      <div className="bg-slate-card border border-slate-border rounded-2xl w-full max-w-md overflow-hidden">
        <div className="relative w-full h-72 bg-slate-deep">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </div>

          <p className="text-cream-muted text-xs">
            Drag to reposition, use the slider to zoom. This is exactly how your photo will appear on the listing.
          </p>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="flex-1 border border-slate-border text-cream font-bold py-3 rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="flex-1 bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {processing ? 'Cropping...' : 'Use This Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}