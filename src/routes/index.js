const express = require('express');
const router = express.Router();
const { getCategories, getNewMovies, getMoviesByCategory } = require('../services/phimapi');

// Endpoint chính trả về JSON với sorts
router.get('/', async (req, res) => {
  // Lấy danh sách thể loại
  const categories = await getCategories();

  // Tạo danh sách thể loại với UID ngẫu nhiên
  const categoryList = categories.map((cat) => ({
    text: cat.name,
    type: 'radio',
    url: `https://phim-kappa.vercel.app/sort/category?uid=${cat.slug}`
  }));

  // JSON chính
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

// Endpoint /newest trả về danh sách phim mới
router.get('/newest', async (req, res) => {
  const moviesData = await getNewMovies(1);
  const movies = moviesData.items || [];

  const channels = movies.map((movie) => ({
    id: movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
    name: movie.name || movie.title || 'Unknown Title',
    description: movie.description || movie.content || 'Không có mô tả',
    image: {
      url: movie.poster_url || movie.thumb_url || 'https://via.placeholder.com/150',
      type: 'cover'
    },
    type: movie.episodes ? 'playlist' : 'single',
    display: 'text-below',
    enable_detail: true,
    remote_data: {
      url: `https://phim-kappa.vercel.app/channel-detail?uid=${movie._id || movie.slug}`
    },
    share: {
      url: `https://phim-kappa.vercel.app/share-channel?uid=${movie._id || movie.slug}`
    }
  }));

  res.json({ channels });
});

// Endpoint /sort/category trả về danh sách phim theo thể loại
router.get('/sort/category', async (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid parameter' });
  }

  const moviesData = await getMoviesByCategory(uid, 1);
  const movies = moviesData.items || [];

  const channels = movies.map((movie) => ({
    id: movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
    name: movie.name || movie.title || 'Unknown Title',
    description: movie.description || movie.content || 'Không có mô tả',
    image: {
      url: movie.poster_url || movie.thumb_url || 'https://via.placeholder.com/150',
      type: 'cover'
    },
    type: movie.episodes ? 'playlist' : 'single',
    display: 'text-below',
    enable_detail: true,
    remote_data: {
      url: `https://phim-kappa.vercel.app/channel-detail?uid=${movie._id || movie.slug}`
    },
    share: {
      url: `https://phim-kappa.vercel.app/share-channel?uid=${movie._id || movie.slug}`
    }
  }));

  res.json({ channels });
});

// Endpoint /channel-detail trả về chi tiết phim (tạm thời proxy đến phimapi.com)
router.get('/channel-detail', async (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid parameter' });
  }

  try {
    const response = await axios.get(`https://phimapi.com/phim/${uid}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// Endpoint /share-channel (tạm thời trả về URL tĩnh)
router.get('/share-channel', (req, res) => {
  const uid = req.query.uid;
  res.json({ url: `https://phim-kappa.vercel.app/share-channel?uid=${uid}` });
});

module.exports = router;
