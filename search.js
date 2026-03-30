// GET /api/search?q=query&filter=videos&page=1
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { q, filter = 'videos', nextpage } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q param required' });

  try {
    let url = `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=${filter}`;
    if (nextpage) url += `&nextpage=${encodeURIComponent(nextpage)}`;

    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'FreeVid/1.0' }
    });

    if (!upstream.ok) throw new Error(`Piped error: ${upstream.status}`);

    const data = await upstream.json(); // { items, nextpage, suggestion, corrected }

    const items = (data.items || []).map(item => {
      if (item.type === 'channel') {
        return {
          type:        'channel',
          channelId:   item.url?.replace('/channel/', '') || '',
          name:        item.name,
          thumbnail:   item.thumbnail,
          subscribers: item.subscribers,
          description: item.description,
          verified:    item.verified,
        };
      }
      return {
        type:          'video',
        videoId:       extractId(item.url),
        title:         item.title,
        thumbnail:     item.thumbnail,
        duration:      item.duration,
        views:         item.views,
        uploadedDate:  item.uploadedDate,
        uploaderName:  item.uploaderName,
        uploaderUrl:   item.uploaderUrl,
        uploaderAvatar: item.uploaderAvatar,
        uploaderVerified: item.uploaderVerified,
        isShort:       item.isShort || false,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      success: true,
      query: q,
      nextpage: data.nextpage || null,
      suggestion: data.suggestion || null,
      items,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

function extractId(url = '') {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/\/shorts\/([^?]+)/);
  return m ? m[1] : url.replace('/watch?v=', '');
}
