const express = require('express');
const router = express.Router();
const { getNewMovies } = require('../services/phimapi');

router.get('/', async (req, res) => {
  // Lấy danh sách phim mới từ phimapi.com
  const moviesData = await getNewMovies(1);
  const movies = moviesData.items || [];

  // Chuyển đổi dữ liệu phim thành định dạng channels
  const channels = movies.map((movie) => ({
    id: movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
    name: movie.name || movie.title || 'Unknown Title',
    description: movie.description || movie.content || '',
    image: {
      url: movie.poster_url || movie.thumb_url || 'https://via.placeholder.com/150',
      type: 'cover'
    },
    type: movie.episodes ? 'playlist' : 'single',
    display: 'text-below',
    enable_detail: true,
    remote_data: {
      url: `https://phimapi.com/phim/${movie.slug}`
    },
    force_landscape: true,
    share: {
      url: `https://phimapi.com/phim/${movie.slug}/share`
    }
  }));

  // JSON trả về
  const response = {
    name: 'Phim Kappa',
    id: 'phimkappa',
    color: '#000000',
    description: 'Phim Kappa là nơi tập hợp các bộ phim hay nhất, mới nhất, hot nhất, mang đến trải nghiệm xem phim mượt mà và chất lượng cao.',
    image: {
      url: 'https://phim-kappa.vercel.app/public/logo.png',
      type: 'cover'
    },
    grid_number: 3,
    channels: channels
  };

  res.json(response);
});

module.exports = router;
