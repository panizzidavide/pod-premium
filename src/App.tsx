import { useEffect, useMemo, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"

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

const mockHistory: UploadItem[] = [
  {
    id: 1,
    spedizione: "801-56789",
    file: "801-56789.pdf",
    pagine: 2,
    stato: "Inviato",
    data: "23/04/2026 09:14",
  },
  {
    id: 2,
    spedizione: "807-123456",
    file: "807-123456.pdf",
    pagine: 1,
    stato: "Fallito",
    data: "23/04/2026 08:52",
    errore: "Connessione FTP non riuscita",
  },
  {
    id: 3,
    spedizione: "801-99881",
    file: "801-99881.pdf",
    pagine: 2,
    stato: "In coda",
    data: "22/04/2026 17:41",
  },
]

function parseBarcode(barcode: string) {
  const value = barcode.trim()

  if (!value) {
    throw new Error("Barcode non valido. Inserisci il numero spedizione manualmente.")
  }

  const commaIndex = value.indexOf(",")
  if (commaIndex === -1) {
    throw new Error("Barcode non valido. Inserisci il numero spedizione manualmente.")
  }

  const prefix = value.slice(0, 3)
  const suffix = value.slice(commaIndex + 1).trim()

  if (!/^\d{3}$/.test(prefix)) {
    throw new Error("Barcode non valido. Prefisso non corretto.")
  }

  if (!/^\d+$/.test(suffix)) {
    throw new Error("Barcode non valido. Parte finale non corretta.")
  }

  return `${prefix}-${suffix}`
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[2.2rem] border border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="h-24 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
          <div className="-mt-10 p-5">{children}</div>
        </div>
      </div>
    </main>
  )
}

function TopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle: string
  onBack?: () => void
}) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/95 px-4 py-3 shadow-lg shadow-slate-200/50">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            POD Manager
          </div>
          <div className="mt-1 text-sm font-semibold text-emerald-600">Sistema online</div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="rounded-2xl border border-white/80 bg-white/95 px-4 py-3 text-sm font-medium text-slate-700 shadow-lg shadow-slate-200/40 transition hover:-translate-y-0.5"
          >
            ← Indietro
          </button>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-lg shadow-slate-200/50">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function HeroCard() {
  return (
    <div className="mb-4 rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Flusso principale
          </p>
          <h2 className="mt-2 text-xl font-semibold">Acquisizione rapida POD</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Barcode, acquisizione documento, PDF e invio in un flusso pensato da smartphone.
          </p>
        </div>
        <div className="mt-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
      </div>
    </div>
  )
}

function ActionButton({
  title,
  subtitle,
  icon,
  primary = false,
  onClick,
}: {
  title: string
  subtitle: string
  icon: string
  primary?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? "w-full rounded-[1.75rem] bg-slate-950 px-5 py-5 text-left text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5"
          : "w-full rounded-[1.75rem] border border-slate-200 bg-white/90 px-5 py-5 text-left text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5"
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={
            primary
              ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl"
              : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl"
          }
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="text-base font-semibold">{title}</div>
            <div
              className={
                primary
                  ? "mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400"
                  : "mt-1 h-2.5 w-2.5 rounded-full bg-slate-300"
              }
            />
          </div>
          <div className={primary ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-500"}>
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: UploadStatus }) {
  if (status === "Inviato") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        Inviato
      </span>
    )
  }

  if (status === "Fallito") {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        Fallito
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
      In coda
    </span>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[1.75rem] bg-slate-950 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
    />
  )
}

function BarcodeScanner({
  onDetected,
  onError,
  shouldScan,
}: {
  onDetected: (value: string) => void
  onError: (value: string) => void
  shouldScan: boolean
}) {
  const elementId = "reader"
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const detectionLockedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!shouldScan) {
      return
    }

    const scanner = new Html5Qrcode(elementId, {
  formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
  verbose: false,
})
    scannerRef.current = scanner
    detectionLockedRef.current = false

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
  fps: 12,
  qrbox: { width: 340, height: 90 },
},
          (decodedText) => {
            if (detectionLockedRef.current) return
            detectionLockedRef.current = true
            onDetected(decodedText)
          },
          () => {}
        )
      } catch {
        onError("Impossibile avviare la fotocamera. Controlla i permessi del browser.")
      }
    }

    start()

    return () => {
      const stopScanner = async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop()
          }
          await scanner.clear()
        } catch {
          // niente
        }
      }
      stopScanner()
      detectionLockedRef.current = false
    }
  }, [onDetected, onError, shouldScan])
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const scanner = scannerRef.current ?? new Html5Qrcode(elementId)
    scannerRef.current = scanner

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    } catch {
      // niente
    }

    const decodedText = await scanner.scanFile(file, false)
    onDetected(decodedText)
  } catch {
    onError("Impossibile leggere il barcode dalla foto. Prova con una foto più nitida o usa inserimento manuale.")
  } finally {
    event.target.value = ""
  }
}

  return (
  <div className="space-y-4">
    <div id={elementId} className="overflow-hidden rounded-[1.5rem]" />

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
      className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
    >
      Carica foto barcode
    </button>
  </div>
)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [barcode, setBarcode] = useState("")
  const [spedizione, setSpedizione] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"tutti" | UploadStatus>("tutti")

  const filteredHistory = useMemo(() => {
    return mockHistory.filter((item) => {
      const matchesFilter = filter === "tutti" ? true : item.stato === filter
      const matchesSearch = `${item.spedizione} ${item.file}`.toLowerCase().includes(search.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [filter, search])

  const goHome = () => {
    setError("")
    setSuccess("")
    setBarcode("")
    setSpedizione("")
    setScreen("home")
  }

  const handleBarcodeValue = (rawValue: string) => {
    if (spedizione) return

    setBarcode(rawValue)

    try {
      const result = parseBarcode(rawValue)
      setSpedizione(result)
      setError("")
      setSuccess(`Barcode letto correttamente. Numero spedizione: ${result}`)
    } catch (err) {
      setSuccess("")
      setError(err instanceof Error ? err.message : "Errore barcode")
    }
  }

  const handleManualConfirm = () => {
    const value = spedizione.trim()
    if (!value) {
      setSuccess("")
      setError("Inserisci un numero spedizione valido.")
      return
    }
    setSpedizione(value)
    setError("")
    setSuccess(`Numero spedizione confermato: ${value}`)
  }

  return (
    <Shell>
      {screen === "home" && (
        <>
          <TopBar
            title="Acquisizione POD"
            subtitle="Scansiona il barcode oppure inserisci la spedizione manualmente."
          />
          <p className="mt-2 text-xs text-slate-400">
            Versione: v1.2 - foto barcode
          </p>

          <HeroCard />

          <div className="space-y-3">
            <ActionButton
              title="Scansiona barcode"
              subtitle="Flusso rapido con lettura codice e acquisizione documento"
              icon="⌁"
              primary
              onClick={() => {
                setError("")
                setSuccess("")
                setBarcode("")
                setSpedizione("")
                setScreen("scan")
              }}
            />
            <ActionButton
              title="Inserimento manuale"
              subtitle="Usa questo flusso quando il barcode manca o non è leggibile"
              icon="✎"
              onClick={() => {
                setError("")
                setSuccess("")
                setScreen("manual")
              }}
            />
            <ActionButton
              title="Storico invii"
              subtitle="Controlla PDF inviati, errori e reinvii"
              icon="▣"
              onClick={() => setScreen("history")}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard label="Inviati" value="26" />
            <StatCard label="Falliti" value="2" />
            <StatCard label="In coda" value="1" />
          </div>
        </>
      )}

      {screen === "scan" && (
        <>
          <TopBar
            title="Scansione barcode"
            subtitle="Consenti la fotocamera del browser e inquadra il barcode dell'etichetta."
            onBack={goHome}
          />

          <SectionCard title="Scanner fotocamera">
            <BarcodeScanner
              shouldScan={!spedizione}
              onDetected={handleBarcodeValue}
              onError={(msg) => {
                setSuccess("")
                setError(msg)
              }}
            />

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-600">Ultimo valore letto</label>
              <TextInput value={barcode} readOnly />
            </div>
          </SectionCard>

          {error && (
            <div className="mt-4 rounded-[1.5rem] bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-[1.5rem] bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
              {success}
            </div>
          )}

          {spedizione && (
            <div className="mt-4">
              <SectionCard title="Spedizione estratta">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Numero spedizione
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{spedizione}</p>
                </div>
              </SectionCard>
            </div>
          )}
        </>
      )}

      {screen === "manual" && (
        <>
          <TopBar
            title="Inserimento manuale"
            subtitle="Inserisci la spedizione quando il barcode manca o non è leggibile."
            onBack={goHome}
          />

          <SectionCard title="Numero spedizione">
            <label className="mb-2 block text-sm font-medium text-slate-600">Inserisci spedizione</label>
            <TextInput
              placeholder="Es. 801-56789"
              value={spedizione}
              onChange={(e) => setSpedizione(e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-500">
              Il nome file finale sarà sempre: numero_spedizione.pdf
            </p>
          </SectionCard>

          {error && (
            <div className="mt-4 rounded-[1.5rem] bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-[1.5rem] bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
              {success}
            </div>
          )}

          <div className="mt-4">
            <PrimaryButton onClick={handleManualConfirm}>Conferma spedizione</PrimaryButton>
          </div>
        </>
      )}

      {screen === "history" && (
        <>
          <TopBar
            title="Storico invii"
            subtitle="Controlla esiti, errori e documenti in coda."
            onBack={goHome}
          />

          <SectionCard title="Ricerca e filtri">
            <TextInput
              placeholder="Cerca spedizione o file"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="mt-3 grid grid-cols-4 gap-2">
              {["tutti", "Inviato", "Fallito", "In coda"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item as "tutti" | UploadStatus)}
                  className={
                    filter === item
                      ? "rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      : "rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                  }
                >
                  {item === "tutti" ? "Tutti" : item}
                </button>
              ))}
            </div>
          </SectionCard>

          <div className="mt-4 space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{item.spedizione}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.file}</p>
                  </div>
                  <StatusBadge status={item.stato} />
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>{item.data}</p>
                  <p>
                    {item.pagine} {item.pagine === 1 ? "pagina" : "pagine"}
                  </p>
                  {item.errore && <p className="text-red-600">{item.errore}</p>}
                </div>
              </div>
            ))}

            {filteredHistory.length === 0 && (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 text-center text-sm text-slate-500">
                Nessun risultato trovato.
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  )
}