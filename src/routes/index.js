const express = require('express');
const router = express.Router();
const {
  getCategories,
  getNewMovies,
  getMoviesByCategory,
  searchMovies,
  getMovieDetail
} = require('../services/phimapi');

const CDN_IMAGE = 'https://phimimg.com';

router.get('/', async (req, res, next) => {
  try {
    const categories = await getCategories();
    const categoryList = categories.map((cat) => ({
      text: cat.name || 'Unknown Category',
      type: 'radio',
      url: `https://phim-kappa.vercel.app/sort/category?uid=${cat.slug || 'unknown'}`
    }));

    const response = {
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
        }
      ]
    };

    res.json(response);
  } catch (error) {
    console.error('Error in / endpoint:', error.message);
    next(error);
  }
});

function mapToChannels(movies) {
  return movies.map((movie) => {
    const id = movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`;
    const slug = movie.slug || id;
    return {
      id,
      name: movie.name || 'Không tên',
      description: movie.description || movie.content || 'Không có mô tả',
      image: {
        url: movie.poster_url || movie.thumb_url || 'https://via.placeholder.com/150',
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
    const moviesData = await getNewMovies(1);
    const movies = moviesData.items || [];
    const channels = mapToChannels(movies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /newest endpoint:', error.message);
    next(error);
  }
});

router.get('/sort/category', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) return res.status(400).json({ error: 'Missing uid parameter' });

    const moviesData = await getMoviesByCategory(uid, 1);
    const movies = moviesData.data?.items || [];
    const channels = mapToChannels(movies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /sort/category endpoint:', error.message);
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const keyword = req.query.keyword;
    if (!keyword) return res.status(400).json({ error: 'Missing keyword parameter' });

    const params = {
      category: req.query.category || '',
      country: req.query.country || '',
      year: req.query.year || '',
      sort_lang: req.query.sort_lang || ''
    };

    const moviesData = await searchMovies(keyword, params);
    const movies = moviesData.data?.items || [];
    const channels = mapToChannels(movies);
    res.json({ channels });
  } catch (error) {
    console.error('Error in /search endpoint:', error.message);
    next(error);
  }
});

router.get('/channel-detail', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) return res.status(400).json({ error: 'Missing uid parameter' });

    const movie = await getMovieDetail(uid);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const episodes = (movie.episodes || []).map(ep => ({
      name: ep.name || 'Tập mới',
      url: ep.link_m3u8 || ep.link_embed || ''
    }));

    const detail = {
      id: movie._id || uid,
      name: movie.name || 'Không tên',
      description: movie.content || 'Không có mô tả',
      image: {
        url: movie.poster_url || movie.thumb_url || 'https://via.placeholder.com/150',
        type: 'cover'
      },
      type: movie.type === 'series' ? 'playlist' : 'single',
      episodes
    };

    res.json(detail);
  } catch (error) {
    console.error('Error in /channel-detail endpoint:', error.message);
    next(error);
  }
});

router.get('/share-channel', (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) return res.status(400).json({ error: 'Missing uid parameter' });

    res.json({ url: `https://phim-kappa.vercel.app/share-channel?uid=${uid}` });
  } catch (error) {
    console.error('Error in /share-channel endpoint:', error.message);
    next(error);
  }
});

module.exports = router;
