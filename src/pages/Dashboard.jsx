import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Dashboard() {
    const [records, setRecords] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState(null)
    const [form, setForm] = useState({
        title: '',
        artist: '',
        genres: [],
        genreInput: '',
        release_year: '',
        format: 'Vinilo',
        status: 'Lo tengo',
        wishlist_priority: '',
        lent_to: '',
        lent_date: '',
        ordered_from: '',
        order_date: '',
        estimated_arrival: '',
        rating: '',
        notes: '',
        tracks: [''],
        favorite: false
    })
    const [coverFile, setCoverFile] = useState(null)
    const [view, setView] = useState('collection')
    const [editingRecord, setEditingRecord] = useState(null)
    const [artists, setArtists] = useState([])
    const [mainView, setMainView] = useState('library')
    const [selectedArtist, setSelectedArtist] = useState(null)
    const [editingArtist, setEditingArtist] = useState(null)
    const [artistImageFile, setArtistImageFile] = useState(null)
    const [artistForm, setArtistForm] = useState({
        name: '',
        country: '',
        born_year: '',
        notes: '',
        spotify_url: '',
        image_url: ''
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [displayMode, setDisplayMode] = useState('cards')

    const MUSIC_GENRES = [
        'Rock', 'Pop', 'Pop Rock', 'Pop Latino', 'Indie', 'Indie Rock', 'Alternative Rock', 'Hard Rock',
        'Punk', 'Punk-Rock', 'Pop-Punk', 'Post-Punk', 'Metal', 'Blues', 'Jazz', 'Soul', 'Funk',
        'Country', 'Folk', 'Reggae', 'Ska', 'Flamenco',
        'Rumba', 'Reggaeton', 'Electrónica', 'Dance', 'Disco', 'House',
        'Techno', 'Synth Pop', 'New Wave', 'Clásica',
        'BSO', 'Hip Hop', 'Rap', 'R&B', 'Gospel',
        'Rock and Roll', 'Psychedelic Rock', 'Progressive Rock',
        'Singer-Songwriter', 'Acústico'
    ]

    const artistSuggestions = [...new Set(records.map(record => record.artist).filter(Boolean))]

    const favoritesCount = records.filter(record => record.favorite).length

    useEffect(() => {
        loadRecords()
        loadArtists()
    }, [])

    useEffect(() => {
        const modalOpen = showForm || selectedRecord || selectedArtist || editingArtist

        document.body.style.overflow = modalOpen ? 'hidden' : ''

        return () => {
            document.body.style.overflow = ''
        }
    }, [showForm, selectedRecord, selectedArtist, editingArtist])

    async function loadRecords() {
        const { data } = await supabase
            .from('records')
            .select('*')
            .order('created_at', { ascending: false })

        setRecords(data || [])
    }

    async function loadArtists() {
        const { data } = await supabase
            .from('artists')
            .select('*')
            .order('name')

        setArtists(data || [])
    }

    function updateForm(field, value) {
        setForm({ ...form, [field]: value })
    }

    function updateTrack(index, value) {
        const newTracks = [...form.tracks]
        newTracks[index] = value
        setForm({ ...form, tracks: newTracks })
    }

    function addTrackInput() {
        setForm({ ...form, tracks: [...form.tracks, ''] })
    }

    function removeTrackInput(index) {
        const newTracks = form.tracks.filter((_, i) => i !== index)
        setForm({ ...form, tracks: newTracks.length ? newTracks : [''] })
    }

    async function addRecord(e) {
        e.preventDefault()

        if (!form.title || !form.artist) {
            alert('Álbum y artista son obligatorios')
            return
        }

        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        let artistId = null

        try {
            const existingArtist = artists.find(
                artist =>
                    artist.name.toLowerCase().trim() ===
                    form.artist.toLowerCase().trim()
            )

            if (existingArtist) {
                artistId = existingArtist.id
            } else {
                const { data: newArtist, error: artistError } = await supabase
                    .from('artists')
                    .insert({
                        user_id: user.id,
                        name: form.artist.trim()
                    })
                    .select()
                    .single()

                if (artistError) {
                    console.error('ARTIST ERROR:', artistError)
                    alert(artistError.message)
                    setLoading(false)
                    return
                }

                artistId = newArtist.id
                await loadArtists()
            }
        } catch (err) {
            console.error('ARTIST CATCH:', err)
            alert('Error creando el artista')
            setLoading(false)
            return
        }

        let coverPath = null

        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('record-covers')
                .upload(fileName, coverFile)

            if (uploadError) {
                alert(uploadError.message)
                setLoading(false)
                return
            }

            coverPath = fileName
        }

        const cleanTracks = form.tracks
            .map(track => track.trim())
            .filter(Boolean)

        const recordData = {
            user_id: user.id,
            title: form.title,
            artist: form.artist,
            artist_id: artistId,
            genre: form.genres[0] || null,
            genres: form.genres,
            release_year: form.release_year ? Number(form.release_year) : null,
            format: form.format,
            status: form.status,
            lent_to: form.lent_to || null,
            lent_date: form.lent_date || null,
            ordered_from: form.ordered_from || null,
            order_date: form.order_date || null,
            estimated_arrival: form.estimated_arrival || null,
            rating: form.rating ? Number(form.rating) : null,
            notes: form.notes,
            tracks: cleanTracks,
            cover_path: coverPath || editingRecord?.cover_path || null,
            wishlist_priority: form.wishlist_priority ? Number(form.wishlist_priority) : null,
            dream_record: form.dream_record || false,
            favorite: form.favorite || false
        }

        let error

        if (editingRecord) {
            const result = await supabase
                .from('records')
                .update(recordData)
                .eq('id', editingRecord.id)

            error = result.error
        } else {
            const result = await supabase
                .from('records')
                .insert(recordData)

            error = result.error
        }

        if (error) {
            alert(error.message)
            setLoading(false)
            return
        }

        setForm({
            title: '',
            artist: '',
            genres: [],
            genreInput: '',
            release_year: '',
            format: 'Vinilo',
            status: 'Lo tengo',
            rating: '',
            notes: '',
            tracks: ['']
        })

        setCoverFile(null)
        setShowForm(false)
        setEditingRecord(null)

        await loadRecords()
        await loadArtists()

        setLoading(false)
    }

    function getCoverUrl(path) {
        if (!path) return null

        const { data } = supabase.storage
            .from('record-covers')
            .getPublicUrl(path)

        return data.publicUrl
    }

    async function logout() {
        await supabase.auth.signOut()
    }

    async function moveToCollection(recordId) {
        const { error } = await supabase
            .from('records')
            .update({
                status: 'Lo tengo'
            })
            .eq('id', recordId)

        if (!error) {
            loadRecords()
            setSelectedRecord(null)
        }
    }

    function startEditRecord(record) {
        setEditingRecord(record)
        setSelectedRecord(null)
        setShowForm(true)

        setForm({
            title: record.title || '',
            artist: record.artist || '',
            genres: record.genres?.length ? record.genres : record.genre ? [record.genre] : [],
            genreInput: '',
            release_year: record.release_year || '',
            format: record.format || 'Vinilo',
            status: record.status || 'Lo tengo',
            lent_to: record.lent_to || '',
            lent_date: record.lent_date || '',
            ordered_from: record.ordered_from || '',
            order_date: record.order_date || '',
            estimated_arrival: record.estimated_arrival || '',
            rating: record.rating || '',
            notes: record.notes || '',
            tracks: record.tracks?.length ? record.tracks : [''],
            wishlist_priority: record.wishlist_priority || '',
            dream_record: record.dream_record || false,
            favorite: record.favorite || false
        })

        setCoverFile(null)
    }

    function openArtist(artist) {
        setSelectedArtist(artist)
    }

    function startEditArtist(artist) {
        setEditingArtist(artist)
        setArtistForm({
            name: artist.name || '',
            country: artist.country || '',
            born_year: artist.born_year || '',
            notes: artist.notes || '',
            spotify_url: artist.spotify_url || '',
            image_url: artist.image_url || ''
        })
        setArtistImageFile(null)
    }

    async function saveArtist(e) {
        e.preventDefault()

        const { data: { user } } = await supabase.auth.getUser()

        let imagePath = editingArtist?.image_path || null

        if (artistImageFile) {
            const fileExt = artistImageFile.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('artist-images')
                .upload(fileName, artistImageFile)

            if (uploadError) {
                alert(uploadError.message)
                return
            }

            imagePath = fileName
        }

        const { error } = await supabase
            .from('artists')
            .update({
                name: artistForm.name,
                country: artistForm.country || null,
                born_year: artistForm.born_year ? Number(artistForm.born_year) : null,
                notes: artistForm.notes || null,
                spotify_url: artistForm.spotify_url || null,
                image_url: artistForm.image_url || null,
                image_path: imagePath
            })
            .eq('id', editingArtist.id)

        if (error) {
            alert(error.message)
            return
        }

        await loadArtists()
        await loadRecords()
        setEditingArtist(null)
    }

    function getArtistImageUrl(artist) {
        if (artist?.image_url) return artist.image_url

        if (!artist?.image_path) return null

        const { data } = supabase.storage
            .from('artist-images')
            .getPublicUrl(artist.image_path)

        return data.publicUrl
    }

    async function fetchArtistImageFromSpotify() {
        if (!artistForm.name) {
            alert('Pon primero el nombre del artista')
            return
        }

        const { data, error } = await supabase.functions.invoke('search-artists-image', {
            body: {
                artistName: artistForm.name
            }
        })

        console.log('SPOTIFY DATA:', data)
        console.log('SPOTIFY ERROR:', error)

        if (error) {
            alert(error.message || 'No se pudo buscar en Spotify')
            return
        }

        if (data?.error) {
            alert(data.error)
            return
        }

        if (!data?.imageUrl) {
            alert('No se encontró imagen para este artista')
            return
        }

        setArtistForm({
            ...artistForm,
            spotify_url: data.spotifyUrl || artistForm.spotify_url,
            image_url: data.imageUrl
        })
    }

    async function deleteRecord(record) {
        const confirmDelete = window.confirm(
            `¿Eliminar "${record.title}" de tu colección? Esta acción no se puede deshacer.`
        )

        if (!confirmDelete) return

        if (record.cover_path) {
            await supabase.storage
                .from('record-covers')
                .remove([record.cover_path])
        }

        const { error } = await supabase
            .from('records')
            .delete()
            .eq('id', record.id)

        if (error) {
            alert(error.message)
            return
        }

        setSelectedRecord(null)
        await loadRecords()
    }

    async function toggleFavorite(record) {
        const { error } = await supabase
            .from('records')
            .update({ favorite: !record.favorite })
            .eq('id', record.id)

        if (error) {
            alert(error.message)
            return
        }

        setSelectedRecord({
            ...record,
            favorite: !record.favorite
        })

        await loadRecords()
    }

    const collectionCount = records.filter(record => record.status === 'Lo tengo').length
    const wishlistCount = records.filter(record => record.status === 'Wishlist').length
    const orderedCount = records.filter(record => record.status === 'Pedido').length
    const borrowedCount = records.filter(record => record.status === 'Prestado').length

    const filteredRecords = records.filter(record => {
        const matchesView =
            view === 'collection' ? record.status === 'Lo tengo' :
                view === 'favorites' ? record.favorite :
                    view === 'wishlist' ? record.status === 'Wishlist' :
                        view === 'ordered' ? record.status === 'Pedido' :
                            view === 'borrowed' ? record.status === 'Prestado' :
                                true

        const search = searchTerm.toLowerCase().trim()

        const matchesSearch =
            !search ||
            record.title?.toLowerCase().includes(search) ||
            record.artist?.toLowerCase().includes(search) ||
            record.release_year?.toString().includes(search) ||
            record.genres?.some(genre => genre.toLowerCase().includes(search)) ||
            record.tracks?.some(track => track.toLowerCase().includes(search))

        return matchesView && matchesSearch
    })

    return (
        <div className="dashboard-page">
            <header className="app-header">
                <div>
                    <span className="eyebrow">Mi colección musical</span>
                    <h1>Mi Estantería de Vinilos</h1>
                    <p>Tu estantería digital de vinilos, CDs y tesoros musicales.</p>
                </div>

                <button className="logout-btn" onClick={logout}>
                    Cerrar sesión
                </button>
            </header>

            <section className="hero-panel">
                <div className="hero-copy">
                    <h2>{collectionCount} discos en colección</h2>

                    <div className="collection-stats">
                        <span>❤️ {favoritesCount} favoritos</span>
                        <span>⭐ {wishlistCount} wishlist</span>
                        <span>📦 {orderedCount} pedidos</span>
                        <span>🤝 {borrowedCount} prestados</span>
                    </div>
                    <p><br />Organiza tu colección por género, año, formato y joyas personales.</p>

                    <button className="primary-action" onClick={() => setShowForm(true)}>
                        + Añadir disco
                    </button>
                </div>

                <div className="hero-vinyl">
                    <div className="vinyl-disc"></div>
                </div>
            </section>

            {favoritesCount > 0 && (
                <section className="favorites-showcase">
                    <h3>❤️ Mis imprescindibles</h3>

                    <div className="favorites-row">
                        {records
                            .filter(record => record.favorite)
                            .slice(0, 10)
                            .map(record => (
                                <button
                                    key={record.id}
                                    className="favorite-cover"
                                    onClick={() => setSelectedRecord(record)}
                                >
                                    {getCoverUrl(record.cover_path) ? (
                                        <img
                                            src={getCoverUrl(record.cover_path)}
                                            alt={record.title}
                                        />
                                    ) : (
                                        <div className="mini-vinyl"></div>
                                    )}
                                </button>
                            ))}
                    </div>
                </section>
            )}

            <div className="main-nav">
                <button
                    className={mainView === 'library' ? 'active' : ''}
                    onClick={() => setMainView('library')}
                >
                    💿 Biblioteca
                </button>

                <button
                    className={mainView === 'artists' ? 'active' : ''}
                    onClick={() => setMainView('artists')}
                >
                    🎤 Artistas
                </button>
            </div>

            {mainView === 'library' && (
                <>
                    <div className="library-tabs">
                        <div className="library-tabs">
                            <button
                                className={view === 'collection' ? 'active' : ''}
                                onClick={() => setView('collection')}
                            >
                                💿 Colección ({collectionCount})
                            </button>

                            <button
                                className={view === 'favorites' ? 'active' : ''}
                                onClick={() => setView('favorites')}
                            >
                                ❤️ Favoritos ({favoritesCount})
                            </button>

                            <button
                                className={view === 'wishlist' ? 'active' : ''}
                                onClick={() => setView('wishlist')}
                            >
                                ⭐ Wishlist ({wishlistCount})
                            </button>

                            <button
                                className={view === 'ordered' ? 'active' : ''}
                                onClick={() => setView('ordered')}
                            >
                                📦 Pedido ({orderedCount})
                            </button>

                            <button
                                className={view === 'borrowed' ? 'active' : ''}
                                onClick={() => setView('borrowed')}
                            >
                                🤝 Prestado ({borrowedCount})
                            </button>
                        </div>
                    </div>

                    <div className="search-bar">
                        <span>🔎</span>

                        <input
                            type="text"
                            placeholder="Buscar por disco, artista, género, año o canción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')}>
                                ×
                            </button>
                        )}
                    </div>

                    <div className="view-toggle">
                        <button
                            className={displayMode === 'cards' ? 'active' : ''}
                            onClick={() => setDisplayMode('cards')}
                        >
                            ▦ Tarjetas
                        </button>

                        <button
                            className={displayMode === 'shelf' ? 'active' : ''}
                            onClick={() => setDisplayMode('shelf')}
                        >
                            ▤ Estantería
                        </button>
                    </div>

                    {displayMode === 'cards' ? (
                        <section className="record-grid">
                            {filteredRecords.map((record) => {
                                const coverUrl = getCoverUrl(record.cover_path)

                                return (
                                    <article
                                        key={record.id}
                                        className="record-card"
                                        onClick={() => setSelectedRecord(record)}
                                    >
                                        {record.favorite && (
                                            <div className="favorite-badge">
                                                ❤️
                                            </div>
                                        )}

                                        <div className="record-art">
                                            {coverUrl ? (
                                                <img src={coverUrl} alt={record.title} />
                                            ) : (
                                                <div className="mini-vinyl"></div>
                                            )}
                                        </div>

                                        <div className="record-info">
                                            <h3>{record.title}</h3>
                                            <p>{record.artist}</p>

                                            <div className="record-tags">
                                                {record.genres?.length > 0 ? (
                                                    record.genres.map((genre) => (
                                                        <span key={genre}>{genre}</span>
                                                    ))
                                                ) : (
                                                    record.genre && <span>{record.genre}</span>
                                                )}

                                                {record.release_year && <span>{record.release_year}</span>}
                                                {record.format && <span>{record.format}</span>}
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </section>
                    ) : (
                        <section className="shelf-view">
                            <div className="shelf-row">
                                {filteredRecords.map((record) => (
                                    <button
                                        key={record.id}
                                        className={`shelf-record ${record.favorite ? 'favorite' : ''}`}
                                        onClick={() => setSelectedRecord(record)}
                                        title={`${record.title} - ${record.artist}`}
                                    >
                                        <span>{record.title}</span>
                                        <small>{record.artist}</small>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {mainView === 'artists' && (
                <section className="artists-grid">
                    {artists.map((artist) => {
                        const artistRecords = records.filter(
                            record => record.artist_id === artist.id || record.artist === artist.name
                        )

                        return (
                            <article
                                key={artist.id}
                                className="artist-card"
                                onClick={() => openArtist(artist)}
                            >
                                <div className="artist-avatar">
                                    {getArtistImageUrl(artist) ? (
                                        <img
                                            src={getArtistImageUrl(artist)}
                                            alt={artist.name}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                                e.currentTarget.parentElement.innerHTML = '🎤'
                                            }}
                                        />
                                    ) : (
                                        '🎤'
                                    )}
                                </div>

                                <div>
                                    <h3>{artist.name}</h3>
                                    <p>{artistRecords.length} discos</p>
                                </div>
                            </article>
                        )
                    })}
                </section>
            )}

            {showForm && (
                <div className="modal-backdrop">
                    <form className="record-modal" onSubmit={addRecord}>
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">Nuevo tesoro</span>
                                <h2>{editingRecord ? 'Editar disco' : 'Añadir disco'}</h2>
                            </div>

                            <button type="button" className="close-btn" onClick={() => setShowForm(false)}>
                                ×
                            </button>
                        </div>

                        <div className="form-grid">
                            <input placeholder="Nombre del álbum *" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />

                            <input
                                list="artist-options"
                                placeholder="Artista *"
                                value={form.artist}
                                onChange={(e) => updateForm('artist', e.target.value)}
                            />

                            <datalist id="artist-options">
                                {artists.map((artist) => (
                                    <option
                                        key={artist.id}
                                        value={artist.name}
                                    />
                                ))}
                            </datalist>

                            <div className="genre-picker">
                                <input
                                    list="genre-options"
                                    placeholder="Buscar género"
                                    value={form.genreInput}
                                    onChange={(e) => updateForm('genreInput', e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()

                                            const genre = form.genreInput.trim()

                                            if (genre && !form.genres.includes(genre)) {
                                                setForm({
                                                    ...form,
                                                    genres: [...form.genres, genre],
                                                    genreInput: ''
                                                })
                                            }
                                        }
                                    }}
                                />

                                <datalist id="genre-options">
                                    {MUSIC_GENRES.map((genre) => (
                                        <option key={genre} value={genre} />
                                    ))}
                                </datalist>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const genre = form.genreInput.trim()

                                        if (genre && !form.genres.includes(genre)) {
                                            setForm({
                                                ...form,
                                                genres: [...form.genres, genre],
                                                genreInput: ''
                                            })
                                        }
                                    }}
                                >
                                    Añadir
                                </button>

                                <div className="selected-genres">
                                    {form.genres.map((genre) => (
                                        <span key={genre}>
                                            {genre}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        genres: form.genres.filter((g) => g !== genre)
                                                    })
                                                }
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <input type="number" placeholder="Año de lanzamiento" value={form.release_year} onChange={(e) => updateForm('release_year', e.target.value)} />

                            <select value={form.format} onChange={(e) => updateForm('format', e.target.value)}>
                                <option>Vinilo</option>
                                <option>CD</option>
                                <option>Cassette</option>
                            </select>

                            <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                                <option>Lo tengo</option>
                                <option>Wishlist</option>
                                <option>Pedido</option>
                                <option>Prestado</option>
                            </select>

                            {form.status === 'Wishlist' && (
                                <select
                                    value={form.wishlist_priority || ''}
                                    onChange={(e) => updateForm('wishlist_priority', e.target.value)}
                                >
                                    <option value="">Prioridad</option>
                                    <option value="5">★★★★★ Imprescindible</option>
                                    <option value="4">★★★★☆ Muy deseado</option>
                                    <option value="3">★★★☆☆ Me interesa</option>
                                    <option value="2">★★☆☆☆ Algún día</option>
                                    <option value="1">★☆☆☆☆ Curiosidad</option>
                                </select>
                            )}

                            {form.status === 'Prestado' && (
                                <>
                                    <input
                                        placeholder="Prestado a..."
                                        value={form.lent_to}
                                        onChange={(e) => updateForm('lent_to', e.target.value)}
                                    />

                                    <div className="form-field">
                                        <label>Fecha del préstamo</label>
                                        <input
                                            type="date"
                                            value={form.lent_date}
                                            onChange={(e) => updateForm('lent_date', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {form.status === 'Pedido' && (
                                <>
                                    <input
                                        placeholder="Pedido en... Amazon, Discogs, tienda..."
                                        value={form.ordered_from}
                                        onChange={(e) => updateForm('ordered_from', e.target.value)}
                                    />
                                    <div className="form-field">
                                        <label>Fecha de pedido</label>
                                        <input
                                            type="date"
                                            value={form.order_date}
                                            onChange={(e) => updateForm('order_date', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Llegada estimada</label>
                                        <input
                                            type="date"
                                            value={form.estimated_arrival}
                                            onChange={(e) => updateForm('estimated_arrival', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="Valoración /10"
                                value={form.rating}
                                onChange={(e) => {
                                    const value = Number(e.target.value)

                                    if (e.target.value === '') {
                                        updateForm('rating', '')
                                        return
                                    }

                                    if (value > 10) {
                                        updateForm('rating', '10')
                                    } else if (value < 0) {
                                        updateForm('rating', '0')
                                    } else {
                                        updateForm('rating', e.target.value)
                                    }
                                }}
                            />

                            <label className="file-input">
                                Portada del disco
                                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                            </label>

                            <div
                                className={`favorite-toggle ${form.favorite ? 'active' : ''}`}
                                onClick={() => updateForm('favorite', !form.favorite)}
                            >
                                <span className="favorite-icon">
                                    {form.favorite ? '❤️' : '🤍'}
                                </span>

                                <div>
                                    <h4>Favorito</h4>
                                    <p>Marcar este disco como imprescindible</p>
                                </div>
                            </div>
                        </div>

                        <textarea placeholder="Notas personales..." value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} />

                        <div className="tracks-section">
                            <h3>Canciones</h3>

                            {form.tracks.map((track, index) => (
                                <div className="track-row" key={index}>
                                    <input
                                        placeholder={`Canción ${index + 1}`}
                                        value={track}
                                        onChange={(e) => updateTrack(index, e.target.value)}
                                    />

                                    <button type="button" onClick={() => removeTrackInput(index)}>
                                        −
                                    </button>
                                </div>
                            ))}

                            <button type="button" className="secondary-action" onClick={addTrackInput}>
                                + Añadir canción
                            </button>
                        </div>

                        <button className="save-btn" type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : editingRecord ? 'Guardar cambios' : 'Guardar disco'}
                        </button>
                    </form>
                </div>
            )}

            {selectedRecord && (
                <div className="modal-backdrop" onClick={() => setSelectedRecord(null)}>
                    <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn detail-close" onClick={() => setSelectedRecord(null)}>
                            ×
                        </button>

                        <div className="detail-layout">
                            <div className="detail-cover">
                                {getCoverUrl(selectedRecord.cover_path) ? (
                                    <img src={getCoverUrl(selectedRecord.cover_path)} alt={selectedRecord.title} />
                                ) : (
                                    <div className="detail-vinyl"></div>
                                )}
                            </div>

                            <div className="detail-info">
                                <span className="eyebrow">{selectedRecord.format || 'Vinilo'}</span>

                                <h2>{selectedRecord.title}</h2>
                                <h3>{selectedRecord.artist}</h3>

                                <div className="detail-tags">
                                    {selectedRecord.favorite && <span>❤️ Favorito</span>}
                                    {selectedRecord.genres?.length > 0 ? (
                                        selectedRecord.genres.map((genre) => (
                                            <span key={genre}>{genre}</span>
                                        ))
                                    ) : (
                                        selectedRecord.genre && <span>{selectedRecord.genre}</span>
                                    )}
                                    {selectedRecord.release_year && <span>{selectedRecord.release_year}</span>}
                                    {selectedRecord.status && <span>{selectedRecord.status}</span>}
                                    {selectedRecord.rating && <span>⭐ {selectedRecord.rating}/10</span>}
                                </div>

                                <button
                                    className="edit-btn"
                                    onClick={() => toggleFavorite(selectedRecord)}
                                >
                                    {selectedRecord.favorite ? '💔 Quitar favorito' : '❤️ Marcar favorito'}
                                </button>

                                <button
                                    className="edit-btn"
                                    onClick={() => startEditRecord(selectedRecord)}
                                >
                                    ✏️ Editar disco
                                </button>

                                <button
                                    className="delete-btn"
                                    onClick={() => deleteRecord(selectedRecord)}
                                >
                                    Eliminar disco
                                </button>

                                {selectedRecord.status === 'Prestado' && (
                                    <div className="detail-block">
                                        <h4>Información de préstamo</h4>

                                        <p>
                                            <strong>Prestado a:</strong> {selectedRecord.lent_to || 'Sin indicar'}
                                        </p>

                                        {selectedRecord.lent_date && (
                                            <p>
                                                <strong>Desde:</strong> {selectedRecord.lent_date}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {selectedRecord.status === 'Pedido' && (
                                    <div className="detail-block">
                                        <h4>Información del pedido</h4>

                                        <p>
                                            <strong>Pedido en:</strong> {selectedRecord.ordered_from || 'Sin indicar'}
                                        </p>

                                        {selectedRecord.order_date && (
                                            <p>
                                                <strong>Fecha de pedido:</strong> {selectedRecord.order_date}
                                            </p>
                                        )}

                                        {selectedRecord.estimated_arrival && (
                                            <p>
                                                <strong>Llegada estimada:</strong> {selectedRecord.estimated_arrival}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {selectedRecord.notes && (
                                    <div className="detail-block">
                                        <h4>Notas personales</h4>
                                        <p>{selectedRecord.notes}</p>
                                    </div>
                                )}

                                {selectedRecord.tracks?.length > 0 && (
                                    <div className="detail-block">
                                        <h4>Canciones</h4>

                                        <ol className="track-list">
                                            {selectedRecord.tracks.map((track, index) => (
                                                <li key={index}>
                                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                                    {track}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {selectedRecord.status === 'Wishlist' && (
                                    <button
                                        className="bought-btn"
                                        onClick={() => moveToCollection(selectedRecord.id)}
                                    >
                                        YA LO HE COMPRADO
                                    </button>
                                )}

                                {selectedRecord.status === 'Pedido' && (
                                    <button
                                        className="bought-btn"
                                        onClick={() => moveToCollection(selectedRecord.id)}
                                    >
                                        YA HA LLEGADO
                                    </button>
                                )}

                                {selectedRecord.status === 'Prestado' && (
                                    <button
                                        className="bought-btn"
                                        onClick={() => moveToCollection(selectedRecord.id)}
                                    >
                                        YA ME LO HAN DEVUELTO
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedArtist && (
                <div className="modal-backdrop" onClick={() => setSelectedArtist(null)}>
                    <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn detail-close" onClick={() => setSelectedArtist(null)}>
                            ×
                        </button>

                        <div className="detail-layout">
                            <div className="detail-cover artist-detail-cover">
                                {getArtistImageUrl(selectedArtist) ? (
                                    <img src={getArtistImageUrl(selectedArtist)} alt={selectedArtist.name} />
                                ) : (
                                    <div className="artist-big-placeholder">🎤</div>
                                )}
                            </div>

                            <div className="detail-info">
                                <span className="eyebrow">Artista</span>
                                <h2>{selectedArtist.name}</h2>

                                <div className="detail-tags">
                                    {selectedArtist.country && <span>{selectedArtist.country}</span>}
                                    {selectedArtist.born_year && <span>{selectedArtist.born_year}</span>}
                                </div>

                                <button className="edit-btn" onClick={() => startEditArtist(selectedArtist)}>
                                    ✏️ Editar artista
                                </button>

                                {selectedArtist.notes && (
                                    <div className="detail-block">
                                        <h4>Notas</h4>
                                        <p>{selectedArtist.notes}</p>
                                    </div>
                                )}

                                <div className="detail-block">
                                    <h4>Discos que tienes de este artista</h4>
                                    <div className="artist-record-list">
                                        {records
                                            .filter(record => record.artist_id === selectedArtist.id || record.artist === selectedArtist.name)
                                            .map(record => (
                                                <button
                                                    key={record.id}
                                                    onClick={() => {
                                                        setSelectedArtist(null)
                                                        setSelectedRecord(record)
                                                    }}
                                                >
                                                    {record.title} {record.release_year && `(${record.release_year})`}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingArtist && (
                <div className="modal-backdrop">
                    <form className="record-modal" onSubmit={saveArtist}>
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">Editar artista</span>
                                <h2>{editingArtist.name}</h2>
                            </div>

                            <button type="button" className="close-btn" onClick={() => setEditingArtist(null)}>
                                ×
                            </button>
                        </div>

                        <div className="form-grid">
                            <div className="form-field">
                                <label>Nombre</label>
                                <input value={artistForm.name} onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })} />
                            </div>

                            <div className="form-field">
                                <label>País</label>
                                <input value={artistForm.country} onChange={(e) => setArtistForm({ ...artistForm, country: e.target.value })} />
                            </div>

                            <div className="form-field">
                                <label>Año de nacimiento / formación</label>
                                <input type="number" value={artistForm.born_year} onChange={(e) => setArtistForm({ ...artistForm, born_year: e.target.value })} />
                            </div>

                            <div className="form-field">
                                <label>URL de Spotify</label>
                                <input value={artistForm.spotify_url} onChange={(e) => setArtistForm({ ...artistForm, spotify_url: e.target.value })} />
                            </div>

                            <label className="file-input">
                                Foto del artista
                                <input type="file" accept="image/*" onChange={(e) => setArtistImageFile(e.target.files[0])} />
                            </label>

                            <button
                                type="button"
                                className="secondary-action"
                                onClick={fetchArtistImageFromSpotify}
                            >
                                🔎 Buscar foto en Spotify
                            </button>
                        </div>

                        <textarea
                            placeholder="Notas sobre el artista..."
                            value={artistForm.notes}
                            onChange={(e) => setArtistForm({ ...artistForm, notes: e.target.value })}
                        />

                        <button className="save-btn" type="submit">
                            Guardar artista
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}

export default Dashboard