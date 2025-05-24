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
    description: 'Phim Kappa - Kho phim trực tuyến miễn phí với hàng ngàn bộ phim bom tấn, phim độc lập, phim Hàn, Âu Mỹ, cập nhật mới nhất, chất lượng FHD, hỗ trợ Vietsub và Lồng Tiếng.',
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
    return {
      id,
      name: movie.name || movie.title || 'Unknown Title',
      description: movie.description || movie.content || 'Không có mô tả chi tiết.',
      image: {
        url: imageUrl && !imageUrl.startsWith('http') ? `${CDN_IMAGE}/${imageUrl}` : imageUrl || 'https://via.placeholder.com/200x300',
        type: 'cover'
      },
      type: movie.type === 'series' ? 'playlist' : 'single',
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

    const categories = await getCategories();
    const tags = [
      {
        type: 'radio',
        url: `https://phim-kappa.vercel.app/newest?k=${movie.movie.type === 'series' ? 'series' : 'movie'}`,
        text: movie.movie.type === 'series' ? 'Phim bộ' : 'Phim lẻ'
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

    const sources = (movie.episodes || []).map((server, serverIndex) => {
      const streams = (server.server_data || []).map((episode, episodeIndex) => {
        const streamId = `${server.server_name}__${episode.name}__${movie.movie._id}__${serverIndex}_${episodeIndex}`;
        return {
          id: streamId,
          name: `${episode.name} (${server.server_name})`,
          remote_data: {
            url: `https://phim-kappa.vercel.app/stream-detail?channelId=${movie.movie._id}&streamId=${streamId}&contentId=${movie.movie._id}&sourceId=${movie.movie._id}`,
            encrypted: false // Loại bỏ encrypted để thử nghiệm
          }
        };
      });

      return {
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
      };
    });

    if (sources.length === 0 || sources.every(source => source.contents[0].streams.length === 0)) {
      console.warn(`No streams generated for uid: ${uid}`);
      sources.push({
        id: movie.movie._id,
        name: 'Default',
        contents: [
          {
            id: movie.movie._id,
            name: '',
            grid_number: 3,
            streams: [
              {
                id: `default__${movie.movie._id}`,
                name: 'Full',
                remote_data: {
                  url: `https://phim-kappa.vercel.app/stream-detail?channelId=${movie.movie._id}&streamId=default__${movie.movie._id}&contentId=${movie.movie._id}&sourceId=${movie.movie._id}`,
                  encrypted: false
                }
              }
            ]
          }
        ]
      });
    }

    const response = {
      tags,
      sources
    };

    res.json(response);
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

    const movie = await getMovieDetail(channelId);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for channelId: ${channelId}`);
      return res.status(404).json({ error: `Movie not found for channelId: ${channelId}` });
    }

    let episode;
    let serverName;
    (movie.episodes || []).forEach((server, serverIndex) => {
      (server.server_data || []).forEach((ep, episodeIndex) => {
        const expectedStreamId = `${server.server_name}__${ep.name}__${movie.movie._id}__${serverIndex}_${episodeIndex}`;
        if (expectedStreamId === streamId) {
          episode = ep;
          serverName = server.server_name;
        }
      });
    });

    if (!episode && streamId.startsWith('default__')) {
      episode = { link_m3u8: null, name: 'Full' };
      serverName = 'Default';
    }

    if (!episode) {
      console.warn(`No episode found for streamId: ${streamId}`);
      return res.status(404).json({ error: `Episode not found for streamId: ${streamId}` });
    }

    if (!episode.link_m3u8 || !episode.link_m3u8.startsWith('http')) {
      console.warn(`Invalid m3u8 link for streamId: ${streamId}`);
      return res.status(404).json({ error: `Invalid stream URL for ${episode.name} (${serverName})` });
    }

    // Kiểm tra link m3u8 bằng axios
    try {
      await axios.head(episode.link_m3u8, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://phimapi.com'
        }
      });
    } catch (error) {
      console.warn(`Failed to validate m3u8 link for streamId: ${streamId}`, error.message);
      return res.status(404).json({ error: `Unable to access stream URL for ${episode.name} (${serverName})` });
    }

    res.json({
      url: episode.link_m3u8,
      encrypted: false
    });
  } catch (error) {
    console.error('Error in /stream-detail endpoint:', error.message);
    next(error);
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

    const channel = {
      id: movie.movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
      name: movie.movie.name || movie.movie.title || 'Unknown Title',
      description: movie.movie.content || movie.movie.description || 'Không có mô tả chi tiết.',
      image: {
        url: movie.movie.poster_url || movie.movie.thumb_url || 'https://via.placeholder.com/200x300',
        type: 'cover'
      },
      type: movie.movie.type === 'series' ? 'playlist' : 'single',
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
