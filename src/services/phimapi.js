const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 }); // Cache 1 giờ
const BASE_URL = 'https://phimapi.com';
const CDN_IMAGE = 'https://phimimg.com';

async function getCategories() {
  const cacheKey = 'categories';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/the-loai`, { timeout: 15000 });
    const data = response.data || [];
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
}

async function getCountries() {
  const cacheKey = 'countries';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/quoc-gia`, { timeout: 15000 });
    const data = response.data || [];
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    return [];
  }
}

async function getNewMovies(page = 1, limit = 20) {
  const cacheKey = `new_movies_${page}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}&limit=${limit}`, { timeout: 15000 });
    const data = response.data || { items: [], totalPages: 0 };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching new movies:', error.message);
    return { items: [], totalPages: 0 };
  }
}

async function getMoviesByCategory(slug, page = 1, limit = 20) {
  const cacheKey = `category_${slug}_${page}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/v1/api/the-loai/${slug}?page=${page}&limit=${limit}&sort_field=_id&sort_type=asc`, { timeout: 15000 });
    const data = response.data || { data: { items: [], totalPages: 0 } };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movies for category ${slug}:`, error.message);
    return { data: { items: [], totalPages: 0 } };
  }
}

async function getMoviesByCountry(slug, page = 1, limit = 20) {
  const cacheKey = `country_${slug}_${page}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}&sort_field=_id&sort_type=asc`, { timeout: 15000 });
    const data = response.data || { data: { items: [], totalPages: 0 } };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movies for country ${slug}:`, error.message);
    return { data: { items: [], totalPages: 0 } };
  }
}

async function searchMovies(keyword, params = {}) {
  const cacheKey = `search_${keyword}_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const query = new URLSearchParams({
      keyword,
      page: params.page || 1,
      sort_field: '_id',
      sort_type: 'asc',
      ...params
    }).toString();
    const response = await axios.get(`${BASE_URL}/v1/api/tim-kiem?${query}`, { timeout: 15000 });
    const data = response.data || { data: { items: [], totalPages: 0 } };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error searching movies:', error.message);
    return { data: { items: [], totalPages: 0 } };
  }
}

async function getMovieDetail(slug) {
  const cacheKey = `movie_${slug}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/phim/${slug}`, { timeout: 15000 });
    const data = response.data || null;
    if (data) cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movie detail for slug ${slug}:`, error.message);
    return null;
  }
}

module.exports = { getCategories, getCountries, getNewMovies, getMoviesByCategory, getMoviesByCountry, searchMovies, getMovieDetail };
