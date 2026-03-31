// GET /api/channel/:id
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const channelId = req.query.id || (req.url.split('/').pop());
  if (!channelId) return res.status(400).json({ success: false, error: 'channelId required' });

  try {
    const upstream = await fetch(
      `https://pipedapi.kavin.rocks/channel/${channelId}`,
      { headers: { 'User-Agent': 'FreeVid/1.0' } }
    );

    if (!upstream.ok) throw new Error(`Piped error: ${upstream.status}`);

    const data = await upstream.json();

    const videos = (data.relatedStreams || []).map(v => ({
      videoId:       extractId(v.url),
      title:         v.title,
      thumbnail:     v.thumbnail,
      duration:      v.duration,
      views:         v.views,
      uploadedDate:  v.uploadedDate,
      isShort:       v.isShort || false,
    }));

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({
      success: true,
      channelId,
      name:        data.name,
      description: data.description,
      avatarUrl:   data.avatarUrl,
      bannerUrl:   data.bannerUrl,
      subscribers: data.subscriberCount,
      verified:    data.verified,
      nextpage:    data.nextpage || null,
      videos,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

function extractId(url = '') {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/\/shorts\/([^?]+)/);
  return m ? m[1] : url.replace('/watch?v=', '');
}
