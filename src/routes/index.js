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
    description: 'Phim Kappa là nơi tập hợp các bộ phim hay nhất, mới nhất, hot nhất, mang đến trải nghiệm xem phim mượt mà và chất lượng cao.',
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
  for (const movie of movies.slice(0, 10)) { // Giới hạn 10 phim để tối ưu
    const detail = await getMovieDetail(movie.slug);
    enriched.push({
      ...movie,
      description: detail?.movie?.content || 'Không có mô tả',
      type: detail?.movie?.type || 'series'
    });
  }
  return [...enriched, ...movies.slice(10)];
}

function mapToChannels(movies) {
  return movies.map((movie) => {
    const id = movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`;
    const slug = movie.slug || id;
    const imageUrl = movie.poster_url || movie.thumb_url;
    return {
      id,
      name: movie.name || movie.title || 'Unknown Title',
      description: movie.description || movie.content || 'Không có mô tả',
      image: {
        url: imageUrl && !imageUrl.startsWith('http') ? `${CDN_IMAGE}/${imageUrl}` : imageUrl || 'https://via.placeholder.com/150',
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

    const streams = (movie.episodes || []).flatMap((server) =>
      (server.items || []).map((episode) => ({
        id: `${episode.name}__${movie.movie._id}`,
        name: episode.name || 'Full',
        remote_data: {
          url: `https://phim-kappa.vercel.app/stream-detail?channelId=${movie.movie._id}&streamId=${episode.name}__${movie.movie._id}&contentId=${movie.movie._id}&sourceId=${movie.movie._id}`,
          encrypted: true
        }
      }))
    );

    const response = {
      tags,
      sources: [
        {
          id: movie.movie._id,
          name: '',
          contents: [
            {
              id: movie.movie._id,
              name: '',
              grid_number: 3,
              streams
            }
          ]
        }
      ]
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

    const episode = (movie.episodes || []).flatMap((server) => server.items || []).find((ep) => `${ep.name}__${movie.movie._id}` === streamId);
    if (!episode) {
      console.warn(`No episode found for streamId: ${streamId}`);
      return res.status(404).json({ error: `Episode not found for streamId: ${streamId}` });
    }

    res.json({
      url: episode.link_m3u8 || 'https://via.placeholder.com/150',
      encrypted: true
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
      description: movie.movie.content || 'Không có mô tả',
      image: {
        url: movie.movie.poster_url || movie.movie.thumb_url || 'https://via.placeholder.com/150',
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
