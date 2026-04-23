import { useEffect, useMemo, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"

type Screen = "home" | "scan" | "manual"

function parseBarcode(barcode: string) {
  const value = barcode.trim()
  const commaIndex = value.indexOf(",")

  if (commaIndex === -1) throw new Error("Barcode non valido")

  const prefix = value.slice(0, 3)
  const suffix = value.slice(commaIndex + 1).replace(/\D/g, "")

  return `${prefix}-${suffix}`
}

function BarcodeScanner({
  onDetected,
}: {
  onDetected: (value: string) => void
}) {
  const elementId = "reader"
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
    })

    scannerRef.current = scanner

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 300, height: 100 } },
      (decodedText) => onDetected(decodedText),
      () => {}
    )

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onDetected])

  const handleFileChange = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return

    const scanner = scannerRef.current ?? new Html5Qrcode(elementId)

    try {
      const decodedText = await scanner.scanFile(file, false)
      onDetected(decodedText)
    } catch {
      alert("Errore lettura barcode")
    }
  }

  return (
    <div className="space-y-4">
      <div id={elementId} className="rounded-xl overflow-hidden" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full p-3 bg-white border rounded-xl"
      >
        📸 Scatta foto barcode
      </button>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [barcode, setBarcode] = useState("")
  const [spedizione, setSpedizione] = useState("")
  const [error, setError] = useState("")

  const handleBarcode = (raw: string) => {
    setBarcode(raw)

    try {
      const parsed = parseBarcode(raw)
      setSpedizione(parsed)
      setError("")
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <main className="p-4 max-w-md mx-auto space-y-4">

      {screen === "home" && (
        <>
          <h1 className="text-2xl font-bold">POD Manager</h1>

          <button
            onClick={() => setScreen("scan")}
            className="w-full p-4 bg-black text-white rounded-xl"
          >
            Scansiona barcode
          </button>

          <button
            onClick={() => setScreen("manual")}
            className="w-full p-4 border rounded-xl"
          >
            Inserimento manuale
          </button>
        </>
      )}

      {screen === "scan" && (
        <>
          <button onClick={() => setScreen("home")}>← Indietro</button>

          <BarcodeScanner onDetected={handleBarcode} />

          <div>
            <p className="text-sm">Barcode</p>
            <p>{barcode}</p>
          </div>

          {spedizione && (
            <div>
              <p className="text-sm">Spedizione</p>
              <p className="text-xl font-bold">{spedizione}</p>
            </div>
          )}

          {error && <p className="text-red-600">{error}</p>}
        </>
      )}

      {screen === "manual" && (
        <>
          <button onClick={() => setScreen("home")}>← Indietro</button>

          <input
            value={spedizione}
            onChange={(e) => setSpedizione(e.target.value)}
            placeholder="801-12345"
            className="w-full p-4 border rounded-xl"
          />
        </>
      )}
    </main>
  )
}