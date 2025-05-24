const axios = require('axios');
const NodeCache = require('node-cache');
const retry = require('axios-retry');

const cache = new NodeCache({ stdTTL: 3600 });
const BASE_URL = 'https://phimapi.com';
const CDN_IMAGE = 'https://phimimg.com';
const SERVER_SUBDOMAINS = ['s1', 's2', 's3', 's4', 's5'];

// Cấu hình axios với retry
const axiosInstance = axios.create({
  timeout: 20000, // Tăng timeout lên 20s
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Referer': 'https://phimapi.com/'
  }
});

retry(axiosInstance, {
  retries: 2, // Thử lại 2 lần
  retryDelay: (retryCount) => retryCount * 1000, // Delay 1s, 2s
  retryCondition: (error) => {
    return axios.isCancel(error) || error.response?.status >= 500 || error.code === 'ECONNABORTED';
  }
});

async function getCategories() {
  const cacheKey = 'categories';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/the-loai`);
    const data = response.data || [];
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return cache.get(cacheKey) || []; // Fallback to stale cache
  }
}

async function getCountries() {
  const cacheKey = 'countries';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/quoc-gia`);
    const data = response.data || [];
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    return cache.get(cacheKey) || []; // Fallback to stale cache
  }
}

async function getNewMovies(page = 1, limit = 20) {
  const cacheKey = `new_movies_${page}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}&limit=${limit}`);
    const data = response.data || { items: [], totalPages: 0 };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching new movies:', error.message);
    return cache.get(cacheKey) || { items: [], totalPages: 0 }; // Fallback to stale cache
  }
}

async function getMoviesByCategory(slug, page = 1, limit = 20) {
  const cacheKey = `category_${slug}_${page}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/v1/api/the-loai/${slug}?page=${page}&limit=${limit}&sort_field=_id&sort_type=asc`);
    const data = response.data || { data: { items: [], totalPages: 0 } };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movies for category ${slug}:`, error.message);
    return cache.get(cacheKey) || { data: { items: [], totalPages: 0 } }; // Fallback to stale cache
  }
}

async function getMoviesByCountry(slug, page = 1, limit = 20) {
  const cacheKey = `country_${slug}_${page}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}&sort_field=_id&sort_type=asc`);
    const data = response.data || { data: { items: [], totalPages: 0 } };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movies for country ${slug}:`, error.message);
    return cache.get(cacheKey) || { data: { items: [], totalPages: 0 } }; // Fallback to stale cache
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
    const response = await axiosInstance.get(`${BASE_URL}/v1/api/tim-kiem?${query}`);
    const data = response.data || { data: { items: [], totalPages: 0 } };
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error searching movies:', error.message);
    return cache.get(cacheKey) || { data: { items: [], totalPages: 0 } }; // Fallback to stale cache
  }
}

async function validateM3u8Link(link, slug, episodeName, serverName) {
  const cachedSubdomain = cache.get(`valid_subdomain_${link}`);
  if (cachedSubdomain) {
    return link.replace(/s\d\.phim1280\.tv/, `${cachedSubdomain}.phim1280.tv`);
  }

  // Kiểm tra subdomains song song
  const requests = SERVER_SUBDOMAINS.map(async (subdomain) => {
    const url = link.replace(/s\d\.phim1280\.tv/, `${subdomain}.phim1280.tv`);
    try {
      const response = await axiosInstance.head(url, {
        timeout: 5000, // Giảm timeout cho HEAD request
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'Referer': 'https://phimapi.com',
          'Origin': 'https://phimapi.com',
          'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL',
          'Connection': 'keep-alive'
        }
      });
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL')) {
        return { subdomain, url };
      }
      console.warn(`Non-m3u8 Content-Type for episode ${episodeName} in server ${serverName} for slug: ${slug}: ${contentType} (subdomain: ${subdomain})`);
      return null;
    } catch (error) {
      console.warn(`Failed to validate m3u8 link for episode ${episodeName} in server ${serverName} for slug: ${slug} (subdomain: ${subdomain}): ${error.message}`);
      return null;
    }
  });

  const results = await Promise.all(requests);
  const validResult = results.find((result) => result);
  if (validResult) {
    cache.set(`valid_subdomain_${link}`, validResult.subdomain, 3600);
    return validResult.url;
  }
  console.warn(`No valid m3u8 link found for episode ${episodeName} in server ${serverName} for slug: ${slug}`);
  return null;
}

async function getMovieDetail(slug) {
  const cacheKey = `movie_${slug}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/phim/${slug}`);
    const data = response.data;
    if (!data || !data.movie) {
      console.warn(`Invalid response for slug: ${slug}`);
      return null;
    }

    // Xử lý episodes song song
    if (data.episodes && data.episodes.length > 0) {
      await Promise.all(
        data.episodes.map(async (server) => {
          if (server.server_data && server.server_data.length > 0) {
            await Promise.all(
              server.server_data.map(async (episode) => {
                if (episode.link_m3u8) {
                  const validLink = await validateM3u8Link(
                    episode.link_m3u8,
                    slug,
                    episode.name,
                    server.server_name
                  );
                  if (validLink) {
                    episode.link_m3u8 = validLink;
                  }
                }
              })
            );
          }
        })
      );
    }

    cache.set(cacheKey, data, 1800); // Cache 30 phút
    return data;
  } catch (error) {
    console.error(`Error fetching movie ${slug}:`, error.message);
    return cache.get(cacheKey) || null; // Fallback to stale cache
  }
}

module.exports = { getCategories, getCountries, getNewMovies, getMoviesByCategory, getMoviesByCountry, searchMovies, getMovieDetail };
