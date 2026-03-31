// GET /api/video/:id  →  vercel routes ?id= via query
// e.g. /api/video/dQw4w9WgXcQ
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Vercel passes path segments as query when using rewrites
  const videoId = req.query.id || (req.url.split('/').pop());
  if (!videoId) return res.status(400).json({ success: false, error: 'videoId required' });

  try {
    const upstream = await fetch(
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      { headers: { 'User-Agent': 'FreeVid/1.0' } }
    );

    if (!upstream.ok) throw new Error(`Piped error: ${upstream.status}`);

    const data = await upstream.json();

    // Pick best video streams (filter mimeType video/mp4, sort by quality desc)
    const videoStreams = (data.videoStreams || [])
      .filter(s => s.mimeType?.includes('video/mp4') && s.videoOnly === false)
      .sort((a, b) => (b.quality?.replace('p','') || 0) - (a.quality?.replace('p','') || 0))
      .map(s => ({ url: s.url, quality: s.quality, mimeType: s.mimeType }));

    // Pick best audio stream
    const audioStreams = (data.audioStreams || [])
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
      .map(s => ({ url: s.url, bitrate: s.bitrate, mimeType: s.mimeType }));

    // Related videos cleaned
    const related = (data.relatedStreams || []).slice(0, 15).map(v => ({
      videoId:       extractId(v.url),
      title:         v.title,
      thumbnail:     v.thumbnail,
      duration:      v.duration,
      views:         v.views,
      uploadedDate:  v.uploadedDate,
      uploaderName:  v.uploaderName,
      uploaderUrl:   v.uploaderUrl,
      uploaderAvatar: v.uploaderAvatar,
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({
      success: true,
      videoId,
      title:           data.title,
      description:     data.description,
      views:           data.views,
      likes:           data.likes,
      uploadDate:      data.uploadDate,
      duration:        data.duration,
      thumbnailUrl:    data.thumbnailUrl,
      hls:             data.hls || null,        // ← HLS stream (best for ExoPlayer!)
      dash:            data.dash || null,       // ← DASH stream
      videoStreams,                              // ← fallback mp4 streams
      audioStreams,
      uploaderName:    data.uploaderName,
      uploaderUrl:     data.uploaderUrl,
      uploaderAvatar:  data.uploaderAvatar,
      uploaderSubscriberCount: data.uploaderSubscriberCount,
      uploaderVerified: data.uploaderVerified,
      category:        data.category,
      tags:            data.tags || [],
      chapters:        data.chapters || [],
      related,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

function extractId(url = '') {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/\/shorts\/([^?]+)/);
  return m ? m[1] : url.replace('/watch?v=', '');
}
