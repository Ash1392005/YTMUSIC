// GET /api/trending?region=IN
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const region = req.query.region || 'IN';

  try {
     https://pipedapi.moomoo.me/trending?region=${region}
    );

    if (!upstream.ok) throw new Error(`Piped error: ${upstream.status}`);

    const data = await upstream.json(); // array of video objects

    // Clean & normalize
    const videos = data.map(v => ({
      videoId:      extractId(v.url),
      title:        v.title,
      thumbnail:    v.thumbnail,
      duration:     v.duration,           // seconds
      views:        v.views,
      uploadedDate: v.uploadedDate,
      uploaderName: v.uploaderName,
      uploaderUrl:  v.uploaderUrl,
      uploaderAvatar: v.uploaderAvatar,
      isShort:      v.isShort || false,
    }));

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    return res.status(200).json({ success: true, region, videos });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

function extractId(url = '') {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/\/shorts\/([^?]+)/);
  return m ? m[1] : url.replace('/watch?v=', '');
}
