const express = require('express');
const router = express.Router();
const { getCategories, getNewMovies, getMoviesByCategory, searchMovies, getMovieDetail } = require('../services/phimapi');

const CDN_IMAGE = 'https://phimimg.com';

// Endpoint chính trả về JSON với sorts
router.get('/', async (req, res) => {
  const categories = await getCategories();
  const categoryList = categories.map((cat) => ({
    text: cat.name,
    type: 'radio',
    url: `https://phim-kappa.vercel.app/sort/category?uid=${cat.slug}`
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
});

// Hàm ánh xạ dữ liệu phim sang định dạng channels
function mapToChannels(movies) {
  return movies.map((movie) => ({
    id: movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
    name: movie.name || movie.title || 'Unknown Title',
    description: movie.description || movie.content || 'Không có mô tả',
    image: {
      url: movie.poster_url ? movie.poster_url : movie.thumb_url ? movie.thumb_url : 'https://via.placeholder.com/150',
      type: 'cover'
    },
    type: movie.type === 'series' ? 'playlist' : 'single', // Giả định series nếu không rõ
    display: 'text-below',
    enable_detail: true,
    remote_data: {
      url: `https://phim-kappa.vercel.app/channel-detail?uid=${movie._id || movie.slug}`
    },
    share: {
      url: `https://phim-kappa.vercel.app/share-channel?uid=${movie._id || movie.slug}`
    }
  }));
}

// Endpoint /newest
router.get('/newest', async (req, res) => {
  const moviesData = await getNewMovies(1);
  const movies = moviesData.items || [];
  const channels = mapToChannels(movies);
  res.json({ channels });
});

// Endpoint /sort/category
router.get('/sort/category', async (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid parameter' });
  }

  const moviesData = await getMoviesByCategory(uid, 1);
  const movies = moviesData.data?.items || [];
  const channels = mapToChannels(movies);
  res.json({ channels });
});

// Endpoint /search
router.get('/search', async (req, res) => {
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
  const channels = mapToChannels(movies);
  res.json({ channels });
});

// Endpoint /channel-detail
router.get('/channel-detail', async (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid parameter' });
  }

  const movie = await getMovieDetail(uid);
  if (!movie) {
    return res.status(500).json({ error: 'Failed to fetch movie details' });
  }

  res.json(movie);
});

// Endpoint /share-channel
router.get('/share-channel', (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid parameter' });
  }

  res.json({ url: `https://phim-kappa.vercel.app/share-channel?uid=${uid}` });
});

module.exports = router;
