import { useEffect, useMemo, useState } from "react"
declare const ScanbotSDK: any

// 🔐 LICENSE KEY
const LICENSE_KEY =
  "Iw98BTOq+6men5KRzEAQwPFYGRJK/j" +
  "5wZ09nF8Q0CsFkljx2XrBfsmErv9Ls" +
  "12pOLBIZSfOQ6thjCBOyOLg0ifhM1f" +
  "ngXgJutlSbGZaZ6PbAKdEdeV7r5+4y" +
  "Ss37ELVpFicOZESw9wHBhoJ4pPXblU" +
  "w1Le2eacIF8GUhPQ+Wp3an4Nj2pRBo" +
  "NeG6h0r48/qqHqazTgpUvKWfvlP/8u" +
  "npjl6lKtH4R8ebBI2W2bKvvNHHGlS7" +
  "gzslN+vqbgKmaYygnkKORXfVtfrSiG" +
  "9q6Uyz2aqzTsw0XzhxIFgWII2MwH5v" +
  "2V76Lu0AJyB5YqdjQCfYZEZiHXdI7Z" +
  "DGJ5NrrO313Q==\nU2NhbmJvdFNESw" +
  "psb2NhbGhvc3R8ZG9tYWluOnBvZC1w" +
  "cmVtaXVtLnZlcmNlbC5hcHAKMTc3Nz" +
  "U5MzU5OQo4Mzg4NjA3Cjg=\n"

// ---------------- TYPES ----------------

type Screen = "home" | "scan" | "manual" | "history"
type UploadStatus = "Inviato" | "Fallito" | "In coda"

type UploadItem = {
  id: number
  spedizione: string
  file: string
  pagine: number
  stato: UploadStatus
  data: string
  errore?: string
}

// ---------------- MOCK ----------------

const mockHistory: UploadItem[] = [
  { id: 1, spedizione: "801-56789", file: "801-56789.pdf", pagine: 2, stato: "Inviato", data: "23/04/2026 09:14" },
  { id: 2, spedizione: "807-123456", file: "807-123456.pdf", pagine: 1, stato: "Fallito", data: "23/04/2026 08:52" },
  { id: 3, spedizione: "801-99881", file: "801-99881.pdf", pagine: 2, stato: "In coda", data: "22/04/2026 17:41" },
]

// ---------------- PARSER ----------------

function parseBarcode(barcode: string) {
  const value = barcode.trim()
  const commaIndex = value.indexOf(",")

  if (commaIndex === -1) throw new Error("Barcode non valido")

  const prefix = value.slice(0, 3)
  const suffix = value.slice(commaIndex + 1).replace(/\D/g, "")

  return `${prefix}-${suffix}`
}

// ---------------- UI ----------------

const Card = ({ children }: any) => (
  <div className="rounded-2xl border p-4 bg-white shadow-sm">{children}</div>
)

const Button = ({ children, ...props }: any) => (
  <button {...props} className="w-full bg-black text-white p-4 rounded-xl font-semibold">
    {children}
  </button>
)

// ---------------- APP ----------------

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [barcode, setBarcode] = useState("")
  const [spedizione, setSpedizione] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [scanbotReady, setScanbotReady] = useState(false)
  const [loading, setLoading] = useState(false)

  // 🔥 INIT SCANBOT
  useEffect(() => {
    ;(async () => {
      try {
        await ScanbotSDK.initialize({
          licenseKey: LICENSE_KEY,
          enginePath:
            "https://cdn.jsdelivr.net/npm/scanbot-web-sdk@latest/bundle/bin/complete/",
        })
        setScanbotReady(true)
      } catch (err) {
        console.error(err)
        setError("Errore inizializzazione Scanbot")
      }
    })()
  }, [])

  // 🔥 SCAN
  const handleScan = async () => {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const config = new ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration()
      const result = await ScanbotSDK.UI.createBarcodeScanner(config)

      const text = result?.items?.[0]?.text
      if (!text) throw new Error("Nessun barcode")

      setBarcode(text)

      const parsed = parseBarcode(text)
      setSpedizione(parsed)
      setSuccess("Barcode letto: " + parsed)
    } catch (e) {
      setError("Errore scansione")
    } finally {
      setLoading(false)
    }
  }

  // ---------------- UI ----------------

  return (
    <main className="p-4 max-w-md mx-auto space-y-4">

      {screen === "home" && (
        <>
          <h1 className="text-2xl font-bold">POD Manager</h1>

          <Button onClick={() => setScreen("scan")}>
            Scansiona barcode
          </Button>
        </>
      )}

      {screen === "scan" && (
        <>
          <Button onClick={() => setScreen("home")}>← Indietro</Button>

          <Card>
            <Button
              onClick={handleScan}
              disabled={!scanbotReady || loading}
            >
              {loading
                ? "Apro scanner..."
                : scanbotReady
                ? "Apri scanner professionale"
                : "Caricamento scanner..."}
            </Button>

            <p className="text-sm mt-2 text-gray-500 text-center">
              Scanner professionale (etichette difficili)
            </p>
          </Card>

          <Card>
            <p className="text-sm">Valore letto</p>
            <p className="font-mono">{barcode}</p>
          </Card>

          {success && <div className="text-green-600">{success}</div>}
          {error && <div className="text-red-600">{error}</div>}

          {spedizione && (
            <Card>
              <p className="text-sm">Spedizione</p>
              <p className="text-xl font-bold">{spedizione}</p>
            </Card>
          )}
        </>
      )}
    </main>
  )
}