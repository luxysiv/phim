const axios = require('axios');

const BASE_URL = 'https://phimapi.com';
const CDN_IMAGE = 'https://phimimg.com';

// Lấy danh sách thể loại
async function getCategories() {
  try {
    const response = await axios.get(`${BASE_URL}/the-loai`, { timeout: 10000 });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
}

// Lấy danh sách phim mới cập nhật
async function getNewMovies(page = 1) {
  try {
    const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`, { timeout: 10000 });
    return response.data || { items: [], totalPages: 0 };
  } catch (error) {
    console.error('Error fetching new movies:', error.message);
    return { items: [], totalPages: 0 };
  }
}

// Lấy danh sách phim theo thể loại
async function getMoviesByCategory(slug, page = 1) {
  try {
    const response = await axios.get(`${BASE_URL}/v1/api/the-loai/${slug}?page=${page}&sort_field=_id&sort_type=asc`, { timeout: 10000 });
    return response.data || { data: { items: [], totalPages: 0 } };
  } catch (error) {
    console.error('Error fetching movies by category:', error.message);
    return { data: { items: [], totalPages: 0 } };
  }
}

// Tìm kiếm phim
async function searchMovies(keyword, params = {}) {
  try {
    const query = new URLSearchParams({
      keyword,
      page: params.page || 1,
      sort_field: '_id',
      sort_type: 'asc',
      ...params
    }).toString();
    const response = await axios.get(`${BASE_URL}/v1/api/tim-kiem?${query}`, { timeout: 10000 });
    return response.data || { data: { items: [], totalPages: 0 } };
  } catch (error) {
    console.error('Error searching movies:', error.message);
    return { data: { items: [], totalPages: 0 } };
  }
}

// Lấy chi tiết phim
async function getMovieDetail(slug) {
  try {
    const response = await axios.get(`${BASE_URL}/phim/${slug}`, { timeout: 10000 });
    return response.data || null;
  } catch (error) {
    console.error('Error fetching movie detail:', error.message);
    return null;
  }
}

module.exports = { getCategories, getNewMovies, getMoviesByCategory, searchMovies, getMovieDetail };
