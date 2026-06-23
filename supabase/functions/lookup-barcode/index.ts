const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barcode } = await req.json()

    if (!barcode) {
      return new Response(JSON.stringify({ error: 'Falta barcode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const searchUrl =
      `https://musicbrainz.org/ws/2/release/?query=barcode:${encodeURIComponent(barcode)}&fmt=json&limit=1`

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'VinylVault/1.0 (local-dev)'
      }
    })

    const searchData = await searchResponse.json()
    const release = searchData.releases?.[0]

    if (!release) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const releaseId = release.id

    const detailUrl =
      `https://musicbrainz.org/ws/2/release/${releaseId}?inc=artists+recordings+media&fmt=json`

    const detailResponse = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'VinylVault/1.0 (local-dev)'
      }
    })

    const detail = await detailResponse.json()

    const title = detail.title || release.title || ''
    const artist = detail['artist-credit']?.map((a) => a.name).join('') || ''
    const releaseYear = detail.date ? Number(detail.date.slice(0, 4)) : null

    const tracks =
      detail.media
        ?.flatMap((medium) =>
          medium.tracks?.map((track) => track.title).filter(Boolean) || []
        ) || []

    const coverUrl =
      `https://coverartarchive.org/release/${releaseId}/front-500`

    return new Response(
      JSON.stringify({
        found: true,
        title,
        artist,
        release_year: releaseYear,
        barcode,
        tracks,
        cover_url: coverUrl,
        musicbrainz_id: releaseId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Error inesperado',
        details: String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})