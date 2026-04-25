import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type Song = {
  id: number
  title: string
  artist: string
  genre: string
  key: string
  mood: string
  energy: string
}

type SavedSetlist = {
  id: number
  name: string
  eventType: string
  sets: number
  createdAt: string
}

type GeneratorForm = {
  eventType: string
  venueType: string
  audienceAgeRange: string
  mood: string
  numberOfSets: number
  songsPerSet: number
  specialInstructions: string
}

type GeneratedSet = {
  title: string
  songs: Song[]
}

type UploadPreview = {
  fileName: string
  detectedType: string
  importedCount: number
  notes: string[]
  songs: Song[]
}

type SongColumn = Exclude<keyof Song, 'id'>
type PartialSong = Partial<Record<SongColumn, string>>

const sampleSongs: Song[] = [
  {
    id: 1,
    title: 'Midnight Drive',
    artist: 'The Echo Lights',
    genre: 'Pop',
    key: 'G',
    mood: 'Warm',
    energy: 'Medium',
  },
  {
    id: 2,
    title: 'City Afterglow',
    artist: 'Nova Avenue',
    genre: 'Indie',
    key: 'D',
    mood: 'Dreamy',
    energy: 'Low',
  },
  {
    id: 3,
    title: 'Saturday Signal',
    artist: 'Golden Static',
    genre: 'Rock',
    key: 'A',
    mood: 'Bold',
    energy: 'High',
  },
  {
    id: 4,
    title: 'Champagne Sky',
    artist: 'Velvet Harbor',
    genre: 'Soul',
    key: 'F',
    mood: 'Romantic',
    energy: 'Low',
  },
  {
    id: 5,
    title: 'Neon Hearts',
    artist: 'The Dayline',
    genre: 'Dance',
    key: 'E',
    mood: 'Upbeat',
    energy: 'High',
  },
  {
    id: 6,
    title: 'Second Street Serenade',
    artist: 'Juniper Lane',
    genre: 'Acoustic',
    key: 'C',
    mood: 'Relaxed',
    energy: 'Low',
  },
  {
    id: 7,
    title: 'Crowd Favorite',
    artist: 'North Arcade',
    genre: 'Pop',
    key: 'B',
    mood: 'Familiar',
    energy: 'Medium',
  },
  {
    id: 8,
    title: 'Firelight Run',
    artist: 'Atlas Bloom',
    genre: 'Folk',
    key: 'G',
    mood: 'Hopeful',
    energy: 'Medium',
  },
  {
    id: 9,
    title: 'Afterparty Avenue',
    artist: 'Static Weekend',
    genre: 'Dance',
    key: 'A',
    mood: 'Electric',
    energy: 'High',
  },
  {
    id: 10,
    title: 'Last Call Lullaby',
    artist: 'Maple & Main',
    genre: 'Acoustic',
    key: 'D',
    mood: 'Tender',
    energy: 'Low',
  },
]

const savedSetlists: SavedSetlist[] = [
  {
    id: 1,
    name: 'Wedding Dinner Set',
    eventType: 'Private Event',
    sets: 2,
    createdAt: 'April 22, 2026',
  },
  {
    id: 2,
    name: 'Restobar Saturday Night',
    eventType: 'Bar Gig',
    sets: 3,
    createdAt: 'April 18, 2026',
  },
  {
    id: 3,
    name: 'Acoustic Mall Busking',
    eventType: 'Busking',
    sets: 1,
    createdAt: 'April 12, 2026',
  },
]

const initialForm: GeneratorForm = {
  eventType: '',
  venueType: '',
  audienceAgeRange: '',
  mood: '',
  numberOfSets: 2,
  songsPerSet: 4,
  specialInstructions: '',
}

const supportedUploadLabel =
  '.txt, .csv, .xls, .xlsx, .docx'

const columnAliases: Record<string, SongColumn> = {
  title: 'title',
  song: 'title',
  songtitle: 'title',
  artist: 'artist',
  singer: 'artist',
  band: 'artist',
  genre: 'genre',
  style: 'genre',
  key: 'key',
  mood: 'mood',
  vibe: 'mood',
  energy: 'energy',
  tempo: 'energy',
}

function toSong(partialSong: PartialSong, id: number): Song {
  const title = partialSong.title?.trim() || `Imported Song ${id}`
  const artist = partialSong.artist?.trim() || 'Unknown Artist'

  return {
    id,
    title,
    artist,
    genre: partialSong.genre?.trim() || 'Unsorted',
    key: partialSong.key?.trim() || '-',
    mood: partialSong.mood?.trim() || 'Imported',
    energy: partialSong.energy?.trim() || 'Medium',
  }
}

function normalizeHeader(value: string) {
  return value.replace(/[^a-z]/gi, '').toLowerCase()
}

function detectDelimiter(line: string) {
  const delimiters = ['\t', '|', ',']
  const ranked = delimiters
    .map((delimiter) => ({
      delimiter,
      count: line.split(delimiter).length,
    }))
    .sort((left, right) => right.count - left.count)

  return ranked[0].count > 1 ? ranked[0].delimiter : null
}

function mapRowToSong(values: string[], id: number) {
  const [title, artist, genre, key, mood, energy] = values

  return toSong(
    {
      title,
      artist,
      genre,
      key,
      mood,
      energy,
    },
    id,
  )
}

function parseLooseSongLine(line: string, id: number) {
  const cleanedLine = line
    .replace(/^\s*[\d]+[\).\s-]*/, '')
    .replace(/^\s*[-*•]+\s*/, '')
    .trim()

  if (!cleanedLine) {
    return null
  }

  const splitter =
    cleanedLine.includes(' - ')
      ? ' - '
      : cleanedLine.includes(' – ')
        ? ' – '
        : cleanedLine.includes(' — ')
          ? ' — '
          : cleanedLine.includes('|')
            ? '|'
            : null

  if (!splitter) {
    return toSong({ title: cleanedLine }, id)
  }

  const segments = cleanedLine
    .split(splitter)
    .map((segment) => segment.trim())
    .filter(Boolean)

  return mapRowToSong(segments, id)
}

function parseTextSongs(text: string, startingId: number) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  const delimiter = detectDelimiter(lines[0])
  const normalizedFirstRow = lines[0]
    .split(delimiter ?? ' ')
    .map((value) => normalizeHeader(value))

  const hasHeaderRow = normalizedFirstRow.some((value) => value in columnAliases)

  if (delimiter && hasHeaderRow) {
    const headers: Array<SongColumn | null> = lines[0]
      .split(delimiter)
      .map((value) => columnAliases[normalizeHeader(value)] ?? null)

    return lines
      .slice(1)
      .map((line, index) => {
        const values = line.split(delimiter).map((value) => value.trim())
        const partialSong: PartialSong = {}

        headers.forEach((header, headerIndex) => {
          if (header) {
            partialSong[header] = values[headerIndex] ?? ''
          }
        })

        return toSong(partialSong, startingId + index)
      })
      .filter((song) => song.title.trim().length > 0)
  }

  if (delimiter) {
    return lines.map((line, index) => {
      const values = line.split(delimiter).map((value) => value.trim())
      return mapRowToSong(values, startingId + index)
    })
  }

  return lines
    .map((line, index) => parseLooseSongLine(line, startingId + index))
    .filter((song): song is Song => song !== null)
}

async function parseWorkbookSongs(data: ArrayBuffer, startingId: number) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    return []
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    raw: false,
    blankrows: false,
  })

  if (rows.length === 0) {
    return []
  }

  const normalizedHeaders: Array<SongColumn | null> = rows[0].map(
    (value) => columnAliases[normalizeHeader(String(value ?? ''))] ?? null,
  )
  const hasHeaderRow = normalizedHeaders.some(Boolean)
  const dataRows = hasHeaderRow ? rows.slice(1) : rows

  return dataRows
    .map((row, index) => {
      const values = row.map((value) => String(value ?? '').trim())

      if (hasHeaderRow) {
        const partialSong: PartialSong = {}

        normalizedHeaders.forEach((header, headerIndex) => {
          if (header) {
            partialSong[header] = values[headerIndex] ?? ''
          }
        })

        return toSong(partialSong, startingId + index)
      }

      return mapRowToSong(values, startingId + index)
    })
    .filter((song) => song.title.trim().length > 0)
}

function App() {
  const [uploadedSongs, setUploadedSongs] = useState<Song[]>([])
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null)
  const [uploadMessage, setUploadMessage] = useState('Import your notes, spreadsheet, or document into a working library preview.')
  const [isUploading, setIsUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All genres')
  const [formData, setFormData] = useState<GeneratorForm>(initialForm)
  const [generatedSets, setGeneratedSets] = useState<GeneratedSet[]>([])
  const [generatorSummary, setGeneratorSummary] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const allSongs = useMemo(() => {
    return [...uploadedSongs, ...sampleSongs]
  }, [uploadedSongs])

  const genres = useMemo(() => {
    const uniqueGenres = new Set(allSongs.map((song) => song.genre))
    return ['All genres', ...Array.from(uniqueGenres)]
  }, [allSongs])

  const filteredSongs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return allSongs.filter((song) => {
      const matchesSearch =
        query.length === 0 ||
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.genre.toLowerCase().includes(query)

      const matchesGenre =
        selectedGenre === 'All genres' || song.genre === selectedGenre

      return matchesSearch && matchesGenre
    })
  }, [allSongs, searchTerm, selectedGenre])

  const handleGenerateSetlist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeSetCount = Math.max(1, Number(formData.numberOfSets) || 1)
    const safeSongsPerSet = Math.max(1, Number(formData.songsPerSet) || 1)
    const totalSongsNeeded = safeSetCount * safeSongsPerSet
    const libraryToUse = filteredSongs.length > 0 ? filteredSongs : allSongs

    const selectedSongs = Array.from({ length: totalSongsNeeded }, (_, index) => {
      return libraryToUse[index % libraryToUse.length]
    })

    const nextSets: GeneratedSet[] = Array.from(
      { length: safeSetCount },
      (_, setIndex) => {
        const start = setIndex * safeSongsPerSet
        const end = start + safeSongsPerSet

        return {
          title: `Set ${setIndex + 1}`,
          songs: selectedSongs.slice(start, end),
        }
      },
    )

    const summaryMood = formData.mood || 'balanced'
    const summaryVenue = formData.venueType || 'live performance'
    const summaryAudience = formData.audienceAgeRange || 'mixed-age crowd'

    setGeneratedSets(nextSets)
    setGeneratorSummary(
      `This mock setlist is tuned for a ${summaryMood.toLowerCase()} ${summaryVenue.toLowerCase()} with a ${summaryAudience.toLowerCase()}. It starts relaxed, builds energy in the middle, and ends with familiar crowd-friendly songs.`,
    )
  }

  const handleCopySetlist = async () => {
    if (generatedSets.length === 0) {
      window.alert('Generate a setlist first.')
      return
    }

    const setlistText = generatedSets
      .map((set) => {
        const songs = set.songs
          .map((song, index) => `${index + 1}. ${song.title} - ${song.artist} (${song.genre})`)
          .join('\n')

        return `${set.title}\n${songs}`
      })
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(setlistText)
      window.alert('Setlist copied to clipboard.')
    } catch {
      window.alert('Clipboard copy is not available in this browser.')
    }
  }

  const handleSaveSetlist = () => {
    window.alert('Save feature coming soon')
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportSongs = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsUploading(true)
    setUploadMessage(`Reading ${file.name}...`)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      const startingId = uploadedSongs.length + sampleSongs.length + 1
      const notes: string[] = []
      let parsedSongs: Song[] = []
      let detectedType = extension?.toUpperCase() || 'Unknown'

      if (extension === 'txt' || extension === 'csv') {
        const text = await file.text()
        parsedSongs = parseTextSongs(text, startingId)
        notes.push('Parsed line-based text import for notes-style song lists.')
      } else if (extension === 'xlsx' || extension === 'xls') {
        const data = await file.arrayBuffer()
        parsedSongs = await parseWorkbookSongs(data, startingId)
        notes.push('Read the first worksheet and mapped columns like Title, Artist, Genre, Key, Mood, and Energy.')
      } else if (extension === 'docx') {
        const data = await file.arrayBuffer()
        const mammothModule = await import('mammoth/mammoth.browser')
        const mammoth = mammothModule.default
        const result = await mammoth.extractRawText({ arrayBuffer: data })
        parsedSongs = parseTextSongs(result.value, startingId)
        notes.push('Extracted raw text from the DOCX file, then interpreted each line as a song entry.')
      } else if (extension === 'doc') {
        throw new Error(
          'Legacy .doc files are not reliable to parse in the browser. Please resave as .docx, .txt, or .xlsx first.',
        )
      } else {
        throw new Error(`Unsupported file type. Please use ${supportedUploadLabel}.`)
      }

      if (parsedSongs.length === 0) {
        throw new Error(
          'No songs were detected. Try a simpler format like one song per line, or use spreadsheet columns named Title and Artist.',
        )
      }

      setUploadedSongs((currentSongs) => [...parsedSongs, ...currentSongs])
      setUploadPreview({
        fileName: file.name,
        detectedType,
        importedCount: parsedSongs.length,
        notes,
        songs: parsedSongs.slice(0, 8),
      })
      setUploadMessage(`Imported ${parsedSongs.length} songs from ${file.name}.`)
      setSelectedGenre('All genres')
      setSearchTerm('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The upload could not be processed.'
      setUploadMessage(message)
      setUploadPreview(null)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <span className="brand-mark">SF</span>
          <div>
            <p className="brand-name">Setflow</p>
            <p className="brand-tagline">
              AI-powered setlist planning for gigging musicians
            </p>
          </div>
        </div>

        <nav className="site-nav" aria-label="Primary">
          <a href="#song-library">Song Library</a>
          <a href="#generate-setlist">Generate Setlist</a>
          <a href="#saved-setlists">Saved Setlists</a>
        </nav>
      </header>

      <main className="page-content">
        <section className="hero-section card">
          <div className="hero-copy">
            <p className="eyebrow">Early MVP dashboard</p>
            <h1>Build better gig setlists in minutes</h1>
            <p className="hero-text">
              Organize your song catalog, shape your vibe for each event, and
              generate setlists that feel ready for the room before you even hit
              the first note.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#generate-setlist">
                Generate a Setlist
              </a>
              <a className="button button-secondary" href="#song-library">
                View Song Library
              </a>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-card">
              <p className="panel-label">Tonight&apos;s planning snapshot</p>
              <div className="hero-stats">
                <article>
                  <strong>{allSongs.length}</strong>
                  <span>songs in library</span>
                </article>
                <article>
                  <strong>{uploadedSongs.length}</strong>
                  <span>imported songs</span>
                </article>
                <article>
                  <strong>3</strong>
                  <span>saved setlists</span>
                </article>
              </div>
              <p className="panel-note">
                Upload a notes export, spreadsheet, or DOCX set catalog and
                Setflow will normalize it into a working song library preview.
              </p>
            </div>
          </div>
        </section>

        <section id="song-library" className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Song Library</p>
              <h2>Your searchable performance catalog</h2>
            </div>
            <div className="upload-actions">
              <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept=".txt,.csv,.xls,.xlsx,.doc,.docx"
                onChange={handleImportSongs}
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? 'Importing...' : 'Upload Song List'}
              </button>
            </div>
          </div>

          <div className="card library-card">
            <div className="library-toolbar">
              <label className="field">
                <span>Search songs</span>
                <input
                  type="search"
                  placeholder="Search by title, artist, or genre"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="field field-small">
                <span>Genre</span>
                <select
                  value={selectedGenre}
                  onChange={(event) => setSelectedGenre(event.target.value)}
                >
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="import-note-block">
              <p className="helper-text">Supported imports: {supportedUploadLabel}</p>
              <p className="upload-status">{uploadMessage}</p>
              <p className="helper-text helper-text-muted">
                `.doc` is accepted in the picker for convenience, but current MVP
                support is limited to `.txt`, `.csv`, `.xls`, `.xlsx`, and `.docx`.
              </p>
            </div>

            {uploadPreview ? (
              <section className="upload-preview">
                <div className="upload-preview-header">
                  <div>
                    <p className="saved-label">Latest import</p>
                    <h3>{uploadPreview.fileName}</h3>
                  </div>
                  <div className="upload-preview-stats">
                    <span>{uploadPreview.detectedType}</span>
                    <span>{uploadPreview.importedCount} songs</span>
                  </div>
                </div>

                <div className="upload-preview-grid">
                  <div className="upload-preview-notes">
                    <h4>Import notes</h4>
                    <ul>
                      {uploadPreview.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="upload-preview-table">
                    <h4>Parsed preview</h4>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Genre</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.songs.map((song) => (
                            <tr key={song.id}>
                              <td>{song.title}</td>
                              <td>{song.artist}</td>
                              <td>{song.genre}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Genre</th>
                    <th>Key</th>
                    <th>Mood</th>
                    <th>Energy</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.length > 0 ? (
                    filteredSongs.map((song) => (
                      <tr key={song.id}>
                        <td>{song.title}</td>
                        <td>{song.artist}</td>
                        <td>{song.genre}</td>
                        <td>{song.key}</td>
                        <td>{song.mood}</td>
                        <td>{song.energy}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        No songs match your current search or genre filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="generate-setlist" className="content-section generator-layout">
          <div className="card generator-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Setlist Generator</p>
                <h2>Plan the room before the first song</h2>
              </div>
            </div>

            <form className="generator-form" onSubmit={handleGenerateSetlist}>
              <label className="field">
                <span>Event type</span>
                <input
                  type="text"
                  placeholder="Wedding, bar gig, private party"
                  value={formData.eventType}
                  onChange={(event) =>
                    setFormData({ ...formData, eventType: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Venue type</span>
                <input
                  type="text"
                  placeholder="Restobar, hotel lounge, outdoor stage"
                  value={formData.venueType}
                  onChange={(event) =>
                    setFormData({ ...formData, venueType: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Audience age range</span>
                <input
                  type="text"
                  placeholder="25-40, mixed ages, family crowd"
                  value={formData.audienceAgeRange}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      audienceAgeRange: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Mood / vibe</span>
                <input
                  type="text"
                  placeholder="Chill, romantic, upbeat, sing-along"
                  value={formData.mood}
                  onChange={(event) =>
                    setFormData({ ...formData, mood: event.target.value })
                  }
                />
              </label>

              <label className="field field-small">
                <span>Number of sets</span>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfSets}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      numberOfSets: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field field-small">
                <span>Songs per set</span>
                <input
                  type="number"
                  min="1"
                  value={formData.songsPerSet}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      songsPerSet: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field field-full">
                <span>Special instructions</span>
                <textarea
                  rows={4}
                  placeholder="Include a strong opener, avoid too many slow songs, add familiar crowd favorites near the end..."
                  value={formData.specialInstructions}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      specialInstructions: event.target.value,
                    })
                  }
                />
              </label>

              <button type="submit" className="button button-primary">
                Generate Mock Setlist
              </button>
            </form>
          </div>

          <div className="card preview-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Generated Setlist Preview</p>
                <h2>Your mock event flow</h2>
              </div>
            </div>

            {generatedSets.length > 0 ? (
              <>
                <p className="preview-summary">{generatorSummary}</p>

                <div className="setlist-grid">
                  {generatedSets.map((set) => (
                    <article key={set.title} className="set-card">
                      <h3>{set.title}</h3>
                      <ul>
                        {set.songs.map((song, index) => (
                          <li key={`${set.title}-${song.id}-${index}`}>
                            <strong>{song.title}</strong>
                            <span>{song.artist}</span>
                            <small>{song.genre}</small>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>

                <div className="preview-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCopySetlist}
                  >
                    Copy Setlist
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleSaveSetlist}
                  >
                    Save Setlist
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>
                  Fill out as much or as little of the form as you want, then
                  generate a mock setlist to preview how Setflow could organize a
                  gig.
                </p>
              </div>
            )}
          </div>
        </section>

        <section id="saved-setlists" className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Saved Setlists</p>
              <h2>Recent planning snapshots</h2>
            </div>
          </div>

          <div className="saved-grid">
            {savedSetlists.map((setlist) => (
              <article key={setlist.id} className="card saved-card">
                <p className="saved-label">Saved draft</p>
                <h3>{setlist.name}</h3>
                <dl>
                  <div>
                    <dt>Event type</dt>
                    <dd>{setlist.eventType}</dd>
                  </div>
                  <div>
                    <dt>Sets</dt>
                    <dd>{setlist.sets}</dd>
                  </div>
                  <div>
                    <dt>Date created</dt>
                    <dd>{setlist.createdAt}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
