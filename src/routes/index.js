const express = require('express');
const router = express.Router();
const { getCategories, getCountries, getNewMovies, getMoviesByCategory, getMoviesByCountry, searchMovies, getMovieDetail } = require('../services/phimapi');

const CDN_IMAGE = 'https://phimimg.com';

async function getProviderData() {
  const categories = await getCategories();
  const countries = await getCountries();
  const moviesData = await getNewMovies(1, 20);
  const movies = moviesData.items || [];

  const categoryList = categories.map((cat) => ({
    text: cat.name || 'Unknown Category',
    type: 'radio',
    url: `https://phim-kappa.vercel.app/sort/category?uid=${cat.slug || 'unknown'}`
  }));
  const countryList = countries.map((country) => ({
    text: country.name || 'Unknown Country',
    type: 'radio',
    url: `https://phim-kappa.vercel.app/sort/nation?uid=${country.slug || 'unknown'}`
  }));

  const enrichedMovies = await enrichMovies(movies);
  const channels = mapToChannels(enrichedMovies);

  return {
    name: 'Phim Kappa',
    id: 'phimkappa',
    url: 'https://phim-kappa.vercel.app',
    color: '#0f172a',
    image: {
      url: 'https://phim-kappa.vercel.app/public/logo.png',
      type: 'cover'
    },
    description: 'Phim Kappa - Kho phim trực tuyến miễn phí với hàng ngàn bộ phim bom tấn, phim độc lập, phim Hàn, Âu Mỹ, hoạt hình, cập nhật mới nhất, chất lượng FHD, hỗ trợ Vietsub và Lồng Tiếng.',
    share: {
      url: 'https://phim-kappa.vercel.app'
    },
    sorts: [
      {
        text: 'Mới nhất',
        type: 'radio',
        url: 'https://phim-kappa.vercel.app/newest'
      },
      {
        text: 'Thể loại',
        type: 'dropdown',
        value: categoryList
      },
      {
        text: 'Quốc gia',
        type: 'dropdown',
        value: countryList
      }
    ],
    grid_number: 3,
    channels
  };
}

router.get('/', async (req, res, next) => {
  try {
    const providerData = await getProviderData();
    res.json(providerData);
  } catch (error) {
    console.error('Error in / endpoint:', error.message);
    next(error);
  }
});

async function enrichMovies(movies) {
  const enriched = [];
  for (const movie of movies.slice(0, 15)) {
    const detail = await getMovieDetail(movie.slug);
    enriched.push({
      ...movie,
      description: detail?.movie?.content || detail?.movie?.description || 'Không có mô tả chi tiết.',
      type: detail?.movie?.type || 'series'
    });
  }
  return [...enriched, ...movies.slice(15)];
}

function mapToChannels(movies) {
  return movies.map((movie) => {
    const id = movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`;
    const slug = movie.slug || id;
    const imageUrl = movie.poster_url || movie.thumb_url;
    const isSeries = ['series', 'hoathinh'].includes(movie.type);
    return {
      id,
      name: movie.name || movie.title || 'Unknown Title',
      description: movie.description || movie.content || 'Không có mô tả chi tiết.',
      image: {
        url: imageUrl && !imageUrl.startsWith('http') ? `${CDN_IMAGE}/${imageUrl}` : imageUrl || 'https://via.placeholder.com/200x300',
        type: 'cover'
      },
      type: isSeries ? 'playlist' : 'single',
      display: 'text-below',
      enable_detail: true,
      remote_data: {
        url: `https://phim-kappa.vercel.app/channel-detail?uid=${slug}`
      },
      share: {
        url: `https://phim-kappa.vercel.app/share-channel?uid=${slug}`
      }
    };
  });
}

router.get('/newest', async (req, res, next) => {
  try {
    const moviesData = await getNewMovies(1, 20);
    const movies = moviesData.items || [];
    if (!movies.length) {
      console.warn('No movies found in /newest');
    }
    const enrichedMovies = await enrichMovies(movies);
    const channels = mapToChannels(enrichedMovies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /newest endpoint:', error.message);
    next(error);
  }
});

router.get('/sort/category', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const moviesData = await getMoviesByCategory(uid, 1, 20);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for category: ${uid}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const channels = mapToChannels(enrichedMovies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /sort/category endpoint:', error.message);
    next(error);
  }
});

router.get('/sort/nation', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const moviesData = await getMoviesByCountry(uid, 1, 20);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for nation: ${uid}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const channels = mapToChannels(enrichedMovies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /sort/nation endpoint:', error.message);
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const keyword = req.query.keyword;
    if (!keyword) {
      return res.status(400).json({ error: 'Missing keyword parameter' });
    }

    const params = {
      category: req.query.category || '',
      country: req.query.country || '',
      year: req.query.year || '',
      sort_lang: req.query.sort_lang || ''
    };

    const moviesData = await searchMovies(keyword, params);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for keyword: ${keyword}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const channels = mapToChannels(enrichedMovies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /search endpoint:', error.message);
    next(error);
  }
});

router.get('/channel-detail', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const movie = await getMovieDetail(uid);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for uid: ${uid}`);
      return res.status(404).json({ error: `Movie not found for uid: ${uid}` });
    }

    const isSeries = ['series', 'hoathinh'].includes(movie.movie.type);
    const categories = await getCategories();
    const tags = [
      {
        type: 'radio',
        url: `https://phim-kappa.vercel.app/newest?k=${isSeries ? 'series' : 'movie'}`,
        text: isSeries ? 'Phim bộ' : 'Phim lẻ'
      },
      ...(movie.movie.category || []).map((cat) => {
        const category = categories.find((c) => c.name === cat.name);
        return {
          type: 'radio',
          url: `https://phim-kappa.vercel.app/group-cate?uid=${category?.slug || 'unknown'}`,
          text: cat.name || 'Unknown Category'
        };
      })
    ];

    const sources = [];
    if (movie.episodes && movie.episodes.length > 0) {
      movie.episodes.forEach((server, serverIndex) => {
        const streams = (server.server_data || []).map((episode, episodeIndex) => {
          const normalizedName = episode.name.replace(/^Tập\s+(\d+)$/, 'Tập $1').replace(/^Tập\s+0+(\d+)$/, 'Tập $1');
          const streamId = `${server.server_name}__${normalizedName}__${movie.movie._id}__${serverIndex}_${episodeIndex}`;
          return {
            id: streamId,
            name: isSeries ? `${normalizedName} (${server.server_name})` : 'Full',
            remote_data: {
              url: `https://phim-kappa.vercel.app/stream-detail?channelId=${movie.movie._id}&streamId=${encodeURIComponent(streamId)}&contentId=${movie.movie._id}&sourceId=${movie.movie._id}`,
              encrypted: false
            }
          };
        });

        if (streams.length > 0) {
          sources.push({
            id: `${movie.movie._id}_${serverIndex}`,
            name: server.server_name,
            contents: [
              {
                id: `${movie.movie._id}_${serverIndex}`,
                name: '',
                grid_number: 3,
                streams
              }
            ]
          });
        }
      });
    }

    if (sources.length === 0 || sources.every(source => source.contents[0].streams.length === 0)) {
      console.warn(`No valid episodes found for uid: ${uid}`);
      return res.status(404).json({ error: `No playable episodes available for ${movie.movie.name}` });
    }

    console.log(`Returning ${sources.reduce((acc, src) => acc + src.contents[0].streams.length, 0)} episodes for uid: ${uid}`);
    res.json({ tags, sources });
  } catch (error) {
    console.error('Error in /channel-detail endpoint:', error.message);
    next(error);
  }
});

router.get('/group-cate', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const moviesData = await getMoviesByCategory(uid, 1, 20);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for category: ${uid}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const channels = mapToChannels(enrichedMovies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /group-cate endpoint:', error.message);
    next(error);
  }
});

router.get('/stream-detail', async (req, res, next) => {
  try {
    const { channelId, streamId, contentId, sourceId } = req.query;
    if (!channelId || !streamId || !contentId || !sourceId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Decode streamId để so sánh chính xác
    const decodedStreamId = decodeURIComponent(streamId);
    
    // Tách thông tin từ streamId
    const [serverName, episodeName, ...rest] = decodedStreamId.split('__');
    const slug = rest[0]; // Lấy slug từ streamId thay vì dùng channelId

    // Lấy thông tin phim từ slug thay vì channelId
    const movie = await getMovieDetail(slug);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for slug: ${slug}`);
      return res.status(404).json({ error: `Movie not found` });
    }

    let episode;
    let found = false;
    
    // Tìm episode tương ứng
    (movie.episodes || []).forEach((server, serverIndex) => {
      if (server.server_name === serverName) {
        (server.server_data || []).forEach((ep) => {
          const normalizedName = ep.name.replace(/^Tập\s+(\d+)$/, 'Tập $1').replace(/^Tập\s+0+(\d+)$/, 'Tập $1');
          if (normalizedName === episodeName) {
            episode = ep;
            found = true;
          }
        });
      }
    });

    if (!found || !episode || !episode.link_m3u8) {
      console.warn(`Episode not found or invalid m3u8 link for streamId: ${streamId}`);
      return res.status(404).json({ error: 'Episode not found or invalid stream URL' });
    }

    // Trả về đúng định dạng
    res.json({
      stream_links: [{
        id: "default",
        name: "default",
        type: "hls",
        default: false,
        url: episode.link_m3u8,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://phimapi.com/'
        }
      }]
    });

  } catch (error) {
    console.error('Stream detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/share-channel', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const movie = await getMovieDetail(uid);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for uid: ${uid}`);
      return res.status(404).json({ error: `Movie not found for uid: ${uid}` });
    }

    const providerData = await getProviderData();
    const isSeries = ['series', 'hoathinh'].includes(movie.movie.type);

    const channel = {
      id: movie.movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
      name: movie.movie.name || movie.movie.title || 'Unknown Title',
      description: movie.movie.content || movie.movie.description || 'Không có mô tả chi tiết.',
      image: {
        url: movie.movie.poster_url || movie.movie.thumb_url || 'https://via.placeholder.com/200x300',
        type: 'cover'
      },
      type: isSeries ? 'playlist' : 'single',
      display: 'text-below',
      enable_detail: true,
      remote_data: {
        url: `https://phim-kappa.vercel.app/channel-detail?uid=${uid}`
      },
      share: {
        url: `https://phim-kappa.vercel.app/share-channel?uid=${uid}`
      }
    };

    res.json({
      channel,
      provider: providerData
    });
  } catch (error) {
    console.error('Error in /share-channel endpoint:', error.message);
    next(error);
  }
});

module.exports = router;
