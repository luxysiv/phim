const axios = require('axios');

const BASE_URL = 'https://phimapi.com';

// Lấy danh sách phim mới cập nhật
async function getNewMovies(page = 1) {
  try {
    const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching new movies:', error.message);
    return { items: [], totalPages: 0 };
  }
}

module.exports = { getNewMovies };
