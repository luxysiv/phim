const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // Giảm TTL xuống 300s
const BASE_URL = 'https://phimapi.com';
const CDN_IMAGE = 'https://phimimg.com';
const SERVER_SUBDOMAINS = ['s1', 's2', 's3', 's4', 's5', 's6'];
const SERVER_DOMAINS = ['phim1280.tv', 'kkphimplayer6.com', 'kkphimplayer.com', 'phim1280.com'];

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

async function validateM3u8Link(link, slug, episodeName, serverName) {
  const cacheKey = `valid_url_${link}`;
  const cachedUrl = cache.get(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Thử từng domain và subdomain tuần tự để tránh quá tải
  for (const domain of SERVER_DOMAINS) {
    for (const subdomain of SERVER_SUBDOMAINS) {
      const url = link.replace(/s\d+\.\w+\.\w+/, `${subdomain}.${domain}`);
      try {
        const response = await axios.head(url, {
          timeout: 15000, // Tăng timeout lên 15s
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'Referer': 'https://phimapi.com',
            'Origin': 'https://phimapi.com',
            'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive'
          }
        });
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL')) {
          cache.set(cacheKey, url, 300);
          console.log(`Validated m3u8 link for episode ${episodeName} in server ${serverName} for slug: ${slug}: ${url}`);
          return url;
        }
        console.warn(`Non-m3u8 Content-Type for episode ${episodeName} in server ${serverName} for slug: ${slug}: ${contentType} (${url})`);
      } catch (error) {
        console.warn(`Failed to validate m3u8 link for episode ${episodeName} in server ${serverName} for slug: ${slug} (${url}): ${error.message}`);
      }
    }
  }

  console.error(`No valid m3u8 link found for episode ${episodeName} in server ${serverName} for slug: ${slug}`);
  return null; // Trả về null nếu không tìm thấy link hợp lệ
}

async function getMovieDetail(slug) {
  const cacheKey = `movie_${slug}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/phim/${slug}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Referer': 'https://phimapi.com'
      }
    });
    const data = response.data || null;
    if (data) {
      if (!data.episodes || data.episodes.length === 0) {
        console.warn(`No episodes found for slug: ${slug}`);
      } else {
        for (const server of data.episodes) {
          if (!server.server_data || server.server_data.length === 0) {
            console.warn(`No items in server ${server.server_name} for slug: ${slug}`);
          } else {
            console.log(`Found ${server.server_data.length} episodes in server ${server.server_name} for slug: ${slug}`);
            for (const item of server.server_data) {
              if (!item.link_m3u8 || !item.link_m3u8.startsWith('http')) {
                console.warn(`Invalid m3u8 link for episode ${item.name} in server ${server.server_name} for slug: ${slug}`);
                item.link_m3u8 = null;
              } else {
                const validLink = await validateM3u8Link(item.link_m3u8, slug, item.name, server.server_name);
                item.link_m3u8 = validLink;
              }
            }
          }
        }
      }
      cache.set(cacheKey, data);
    } else {
      console.warn(`No data returned for slug: ${slug}`);
    }
    return data;
  } catch (error) {
    console.error(`Error fetching movie detail for slug ${slug}:`, error.message);
    return null;
  }
}

module.exports = { getCategories, getCountries, getNewMovies, getMoviesByCategory, getMoviesByCountry, searchMovies, getMovieDetail };
