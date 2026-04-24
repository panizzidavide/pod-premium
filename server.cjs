const express = require("express")
const cors = require("cors")
const multer = require("multer")
const ftp = require("basic-ftp")
require("dotenv").config()

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())

app.post("/api/upload-pod", upload.single("pdf"), async (req, res) => {
  const client = new ftp.Client()
  client.ftp.verbose = false

  try {
    if (!req.file) {
      return res.status(400).json({ error: "File PDF mancante." })
    }

    const spedizione = req.body.spedizione
    if (!spedizione) {
      return res.status(400).json({ error: "Spedizione mancante." })
    }

    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false,
    })

    const remoteFilename = `${spedizione}.pdf`

    await client.uploadFrom(
      ReadableFromBuffer(req.file.buffer),
      remoteFilename
    )

    await client.close()
    return res.json({ ok: true, filename: remoteFilename })
  } catch (err) {
    await client.close()
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Errore FTP",
    })
  }
})

function ReadableFromBuffer(buffer) {
  const { Readable } = require("stream")
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend FTP attivo su http://localhost:${PORT}`)
})