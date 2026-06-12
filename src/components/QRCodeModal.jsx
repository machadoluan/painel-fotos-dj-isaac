import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeModal({ url, eventName, onClose, extra = null }) {
  const handlePrint = () => window.print()

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
        <p className="text-xs text-gray-400 mb-6 break-all">{url}</p>

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
