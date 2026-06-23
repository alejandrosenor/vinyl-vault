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
    const { trackTitle, artistName } = await req.json()

    if (!trackTitle || !artistName) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: 'grant_type=client_credentials',
    })

    const tokenData = await tokenResponse.json()

    const query = `track:${trackTitle} artist:${artistName}`

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1&market=ES`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    )

    const searchData = await searchResponse.json()
    const track = searchData.tracks?.items?.[0]

    if (!track) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        found: true,
        id: track.id,
        name: track.name,
        spotifyUrl: track.external_urls?.spotify,
        artists: track.artists?.map((artist) => artist.name) || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Error inesperado', details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})