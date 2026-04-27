import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { jsPDF } from "jspdf"

type Screen = "home" | "scan" | "manual" | "pod"

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/tvnamews4hfy1m1v6lt8aqv9q2oitq7m"

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

function InfoPanel() {
  return (
    <div className="mb-4 rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Flusso operativo
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        1. Leggi il barcode con Honeywell. 2. Scatta la foto del POD. 3. Premi Trasmetti POD:
        il PDF viene creato e inviato automaticamente.
      </p>
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
          <div className="text-base font-semibold">{title}</div>
          <div className={primary ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-500"}>
            {subtitle}
          </div>
        </div>
      </div>
    </button>
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

function SpedizioneCard({ spedizione }: { spedizione: string }) {
  if (!spedizione) return null

  return (
    <div className="mb-4">
      <SectionCard title="Spedizione estratta">
        <div className="rounded-[1.25rem] bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Numero spedizione
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {spedizione}
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

function BarcodeScanner({
  onDetected,
  onError,
  shouldScan,
  scannerId,
  enablePhotoUpload = true,
}: {
  onDetected: (value: string) => void
  onError: (value: string) => void
  shouldScan: boolean
  scannerId: string
  enablePhotoUpload?: boolean
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const detectionLockedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!shouldScan) return

    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner
    detectionLockedRef.current = false

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 340, height: 90 } },
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
          if (scanner.isScanning) await scanner.stop()
          await scanner.clear()
        } catch {
          // niente
        }
      }
      stopScanner()
      detectionLockedRef.current = false
    }
  }, [onDetected, onError, shouldScan, scannerId])

  const fileToDataUrlLocal = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const dataUrlToFile = async (dataUrl: string, filename: string) => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return new File([blob], filename, { type: "image/png" })
  }

  const preprocessBarcodeImage = (src: string) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas non disponibile"))
          return
        }

        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          let gray = 0.299 * r + 0.587 * g + 0.114 * b
          gray = gray > 160 ? 255 : gray < 90 ? 0 : gray

          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      }

      img.onerror = reject
      img.src = src
    })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const scanner = scannerRef.current ?? new Html5Qrcode(scannerId)
      scannerRef.current = scanner

      try {
        if (scanner.isScanning) await scanner.stop()
      } catch {
        // niente
      }

      const originalDataUrl = await fileToDataUrlLocal(file)
      const processedDataUrl = await preprocessBarcodeImage(originalDataUrl)
      const processedFile = await dataUrlToFile(processedDataUrl, "barcode-processed.png")

      try {
        const decodedText = await scanner.scanFile(processedFile, false)
        onDetected(decodedText)
      } catch {
        const fallbackDecodedText = await scanner.scanFile(file, false)
        onDetected(fallbackDecodedText)
      }
    } catch {
      onError("Impossibile leggere il barcode dalla foto. Prova con una foto più nitida o usa inserimento manuale.")
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div id={scannerId} className="overflow-hidden rounded-[1.5rem]" />

      {enablePhotoUpload && (
        <>
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
        </>
      )}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [barcode, setBarcode] = useState("")
  const [spedizione, setSpedizione] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [honeywellValue, setHoneywellValue] = useState("")
  const [useCamera, setUseCamera] = useState(false)

  const [podPage1, setPodPage1] = useState<File | null>(null)
  const [podPage2, setPodPage2] = useState<File | null>(null)
  const [podPage1Preview, setPodPage1Preview] = useState("")
  const [podPage2Preview, setPodPage2Preview] = useState("")
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  const [isUploading, setIsUploading] = useState(false)

  const honeywellInputRef = useRef<HTMLInputElement | null>(null)
  const honeywellTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (screen === "scan") {
      const t = window.setTimeout(() => {
        honeywellInputRef.current?.focus()
      }, 150)

      return () => clearTimeout(t)
    }
  }, [screen])

  useEffect(() => {
    if (!honeywellValue.trim()) return

    if (honeywellTimerRef.current) {
      window.clearTimeout(honeywellTimerRef.current)
    }

    honeywellTimerRef.current = window.setTimeout(() => {
      handleHoneywellSubmit(honeywellValue)
    }, 120)

    return () => {
      if (honeywellTimerRef.current) {
        window.clearTimeout(honeywellTimerRef.current)
      }
    }
  }, [honeywellValue])

  const resetApp = () => {
    setBarcode("")
    setSpedizione("")
    setError("")
    setSuccess("")
    setHoneywellValue("")
    setUseCamera(false)
    setPodPage1(null)
    setPodPage2(null)
    setPodPage1Preview("")
    setPodPage2Preview("")
    setPdfBlob(null)
    setScreen("home")
  }

  const goHome = () => resetApp()

  const focusHoneywell = () => {
    honeywellInputRef.current?.focus()
  }

  const goToPodStep = () => {
    setUseCamera(false)
    setScreen("pod")
  }

  const handleBarcodeValue = (rawValue: string) => {
    if (spedizione) return

    setBarcode(rawValue)

    try {
      const result = parseBarcode(rawValue)
      setSpedizione(result)
      setError("")
      setSuccess(`Barcode letto correttamente. Numero spedizione: ${result}`)

      window.setTimeout(() => {
        setScreen("pod")
      }, 350)
    } catch (err) {
      setSuccess("")
      setError(err instanceof Error ? err.message : "Errore barcode")
    }
  }

  const handleHoneywellSubmit = (rawValue: string) => {
    const cleanValue = rawValue.trim()
    if (!cleanValue) return
    if (spedizione) return

    try {
      const result = parseBarcode(cleanValue)
      setBarcode(cleanValue)
      setSpedizione(result)
      setError("")
      setSuccess(`Barcode letto correttamente. Numero spedizione: ${result}`)
      setHoneywellValue("")

      window.setTimeout(() => {
        setScreen("pod")
      }, 350)
    } catch (err) {
      setSuccess("")
      setError(err instanceof Error ? err.message : "Errore barcode Honeywell")
      setHoneywellValue("")
    }
  }

  const handleManualConfirm = () => {
    const value = spedizione.trim()
    if (!value) {
      setSuccess("")
      setError("Inserisci un numero spedizione valido.")
      return
    }

    setError("")
    setSuccess(`Numero spedizione confermato: ${value}`)
    setScreen("pod")
  }

  const handlePodFile = async (file: File | null, page: 1 | 2) => {
    if (!file) return

    const preview = await fileToDataUrl(file)

    if (page === 1) {
      setPodPage1(file)
      setPodPage1Preview(preview)
    } else {
      setPodPage2(file)
      setPodPage2Preview(preview)
    }

    setPdfBlob(null)
    setError("")
    setSuccess("")
  }

  const compressImageForPdf = async (file: File) => {
    const dataUrl = await fileToDataUrl(file)
    const img = new Image()

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = dataUrl
    })

    const maxWidth = 1200
    const scale = Math.min(1, maxWidth / img.width)

    const canvas = document.createElement("canvas")
    canvas.width = img.width * scale
    canvas.height = img.height * scale

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Canvas non disponibile")
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL("image/jpeg", 0.65)
  }

  const addImageToPdfPage = async (pdf: jsPDF, file: File, firstPage: boolean) => {
    const dataUrl = await compressImageForPdf(file)
    const img = new Image()

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = dataUrl
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = img.width
    const imgHeight = img.height

    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight)
    const renderWidth = imgWidth * ratio
    const renderHeight = imgHeight * ratio

    const x = (pageWidth - renderWidth) / 2
    const y = (pageHeight - renderHeight) / 2

    if (!firstPage) {
      pdf.addPage()
    }

    pdf.addImage(dataUrl, "JPEG", x, y, renderWidth, renderHeight)
  }

  const buildPdfBlob = async () => {
    if (!spedizione) {
      throw new Error("Manca il numero spedizione.")
    }

    if (!podPage1) {
      throw new Error("Carica almeno la prima pagina POD.")
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

    await addImageToPdfPage(pdf, podPage1, true)

    if (podPage2) {
      await addImageToPdfPage(pdf, podPage2, false)
    }

    return pdf.output("blob")
  }

  const handleDownloadPdf = () => {
    if (!pdfBlob || !spedizione) return

    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${spedizione}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleTransmitPod = async () => {
    if (!spedizione) {
      setError("Manca il numero spedizione.")
      return
    }

    if (!podPage1) {
      setError("Carica almeno la prima pagina POD.")
      return
    }

    try {
      setIsUploading(true)
      setError("")
      setSuccess("Creo PDF...")

      const blob = await buildPdfBlob()
      setPdfBlob(blob)

      setSuccess("Trasmetto POD...")

      const formData = new FormData()
      formData.append("spedizione", spedizione)
      formData.append("filename", `${spedizione}.pdf`)
      formData.append("file", blob, `${spedizione}.pdf`)

      const res = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      })

      const text = await res.text()

      if (!res.ok) {
        throw new Error(`Make errore ${res.status}: ${text}`)
      }

      setSuccess(`POD trasmesso correttamente: ${spedizione}.pdf`)
      navigator.vibrate?.(200)

      setTimeout(() => {
        resetApp()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore trasmissione POD")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Shell>
      {screen === "home" && (
        <>
          <TopBar
            title="Acquisizione POD"
            subtitle="Scansiona il barcode, fotografa il POD e trasmetti il PDF."
          />

          <p className="mt-2 text-xs text-slate-400">
            Versione: v1.8 industriale - trasmissione diretta
          </p>

          <InfoPanel />

          <div className="space-y-3">
            <ActionButton
              title="Scansiona barcode"
              subtitle="Metodo principale: Honeywell. Fallback: foto barcode o live scan."
              icon="⌁"
              primary
              onClick={() => {
                resetApp()
                setScreen("scan")
              }}
            />

            <ActionButton
              title="Inserimento manuale"
              subtitle="Usa questo flusso quando il barcode manca o non è leggibile."
              icon="✎"
              onClick={() => {
                resetApp()
                setScreen("manual")
              }}
            />
          </div>
        </>
      )}

      {screen === "scan" && (
        <>
          <TopBar
            title="Scansione barcode"
            subtitle="Usa Honeywell come metodo principale. Attiva la fotocamera solo se serve."
            onBack={goHome}
          />

          <SpedizioneCard spedizione={spedizione} />

          <SectionCard title="Lettura Honeywell">
            <button
              type="button"
              onClick={focusHoneywell}
              className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 text-left"
            >
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Premi il trigger del lettore Honeywell. La lettura parte automaticamente.
                </p>

                <input
                  ref={honeywellInputRef}
                  value={honeywellValue}
                  onChange={(e) => setHoneywellValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleHoneywellSubmit(honeywellValue)
                    }
                  }}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                  placeholder="Pronto per Honeywell..."
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                />

                <p className="text-xs text-slate-400">
                  Tocca questo riquadro se vuoi rifocalizzare il campo.
                </p>
              </div>
            </button>
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Fotocamera di supporto">
              <div className="space-y-4">
                <BarcodeScanner
                  scannerId="reader-photo"
                  shouldScan={false}
                  enablePhotoUpload={true}
                  onDetected={handleBarcodeValue}
                  onError={(msg) => {
                    setSuccess("")
                    setError(msg)
                  }}
                />

                <p className="text-center text-sm text-slate-500">
                  Usa la fotocamera solo se Honeywell non è disponibile.
                </p>

                {!useCamera ? (
                  <button
                    onClick={() => setUseCamera(true)}
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    Usa scansione live
                  </button>
                ) : (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">Scansione live attiva</p>

                      <button
                        onClick={() => setUseCamera(false)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Chiudi fotocamera
                      </button>
                    </div>

                    <BarcodeScanner
                      scannerId="reader-live"
                      shouldScan={useCamera && !spedizione}
                      enablePhotoUpload={false}
                      onDetected={handleBarcodeValue}
                      onError={(msg) => {
                        setSuccess("")
                        setError(msg)
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Ultimo valore letto
                </label>
                <TextInput value={barcode} readOnly />
              </div>
            </SectionCard>
          </div>

          {spedizione && (
            <div className="mt-4">
              <PrimaryButton onClick={goToPodStep}>Continua con POD</PrimaryButton>
            </div>
          )}

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
        </>
      )}

      {screen === "pod" && (
        <>
          <TopBar
            title="Foto POD"
            subtitle="Scatta la foto del POD. La seconda pagina è opzionale."
            onBack={() => setScreen("scan")}
          />

          <SpedizioneCard spedizione={spedizione} />

          <SectionCard title="Pagina 1 POD">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePodFile(e.target.files?.[0] ?? null, 1)}
              className="block w-full text-sm text-slate-700"
            />

            {podPage1Preview && (
              <img
                src={podPage1Preview}
                alt="Anteprima POD pagina 1"
                className="mt-4 w-full rounded-[1.25rem] border border-slate-200"
              />
            )}
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Pagina 2 POD (opzionale)">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePodFile(e.target.files?.[0] ?? null, 2)}
                className="block w-full text-sm text-slate-700"
              />

              {podPage2Preview && (
                <img
                  src={podPage2Preview}
                  alt="Anteprima POD pagina 2"
                  className="mt-4 w-full rounded-[1.25rem] border border-slate-200"
                />
              )}
            </SectionCard>
          </div>

          <div className="mt-4 space-y-3">
            <PrimaryButton onClick={handleTransmitPod} disabled={isUploading}>
              {isUploading ? "Trasmissione in corso..." : "Trasmetti POD"}
            </PrimaryButton>

            <button
              onClick={handleDownloadPdf}
              disabled={!pdfBlob}
              className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Scarica copia PDF
            </button>
          </div>

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
        </>
      )}

      {screen === "manual" && (
        <>
          <TopBar
            title="Inserimento manuale"
            subtitle="Inserisci la spedizione quando il barcode manca o non è leggibile."
            onBack={goHome}
          />

          <SpedizioneCard spedizione={spedizione} />

          <SectionCard title="Numero spedizione">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Inserisci spedizione
            </label>

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

          <div className="mt-4 space-y-3">
            <PrimaryButton onClick={handleManualConfirm}>Conferma spedizione</PrimaryButton>

            {spedizione && (
              <PrimaryButton onClick={() => setScreen("pod")}>Vai a foto POD</PrimaryButton>
            )}
          </div>
        </>
      )}
    </Shell>
  )
}