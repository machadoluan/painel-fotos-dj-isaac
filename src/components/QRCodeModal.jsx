import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeModal({ url, eventName, onClose, extra = null }) {
  const [copied, setCopied] = useState(false)

  const handlePrint = () => window.print()

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-800 mb-1">QR Code</h2>
        <p className="text-gray-500 text-sm mb-6">{eventName}</p>

        <div className="flex justify-center mb-6">
          <div className="p-4 border-2 border-gray-100 rounded-xl">
            <QRCodeSVG value={url} size={200} level="H" includeMargin />
          </div>
        </div>

        {extra}

        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs py-2.5 rounded-xl font-medium transition-colors mb-4"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-600">Link copiado!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="break-all">{url}</span>
            </>
          )}
        </button>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
