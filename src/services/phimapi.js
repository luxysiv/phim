const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://phimapi.com';
const CDN_IMAGE = 'https://phimimg.com';
const SERVER_SUBDOMAINS = ['s1', 's2', 's3', 's4', 's5'];
const TMP_DIR = '/tmp'; // Thư mục tạm thời của Vercel
const FILE_TTL = 3600 * 1000; // 1 giờ (thời gian để ghi đè file, tính bằng ms)

// Hàm tiện ích để đọc file JSON
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

// Hàm tiện ích để ghi file JSON
async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Wrote file ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
  }
}

// Hàm kiểm tra xem file có cần ghi đè không (dựa trên thời gian sửa đổi)
async function shouldUpdateFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const now = Date.now();
    return now - stats.mtimeMs > FILE_TTL; // Ghi đè nếu file cũ hơn 1 giờ
  } catch {
    return true; // File không tồn tại, cần tạo mới
  }
}

async function getCategories() {
  const filePath = path.join(TMP_DIR, 'categories.json');
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/the-loai`, { timeout: 15000 });
    const data = response.data || [];
    await writeJsonFile(filePath, data);
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    const cached = await readJsonFile(filePath);
    return cached || [];
  }
}

async function getCountries() {
  const filePath = path.join(TMP_DIR, 'countries.json');
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/quoc-gia`, { timeout: 15000 });
    const data = response.data || [];
    await writeJsonFile(filePath, data);
    return data;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    const cached = await readJsonFile(filePath);
    return cached || [];
  }
}

async function getNewMovies(page = 1, limit = 20) {
  const filePath = path.join(TMP_DIR, `new_movies_${page}_${limit}.json`);
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}&limit=${limit}`, { timeout: 15000 });
    const data = response.data || { items: [], totalPages: 0 };
    await writeJsonFile(filePath, data);
    return data;
  } catch (error) {
    console.error('Error fetching new movies:', error.message);
    const cached = await readJsonFile(filePath);
    return cached || { items: [], totalPages: 0 };
  }
}

async function getMoviesByCategory(slug, page = 1, limit = 20) {
  const filePath = path.join(TMP_DIR, `category_${slug}_${page}_${limit}.json`);
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/v1/api/the-loai/${slug}?page=${page}&limit=${limit}&sort_field=_id&sort_type=asc`, { timeout: 15000 });
    const data = response.data || { data: { items: [], totalPages: 0 } };
    await writeJsonFile(filePath, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movies for category ${slug}:`, error.message);
    const cached = await readJsonFile(filePath);
    return cached || { data: { items: [], totalPages: 0 } };
  }
}

async function getMoviesByCountry(slug, page = 1, limit = 20) {
  const filePath = path.join(TMP_DIR, `country_${slug}_${page}_${limit}.json`);
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}&sort_field=_id&sort_type=asc`, { timeout: 15000 });
    const data = response.data || { data: { items: [], totalPages: 0 } };
    await writeJsonFile(filePath, data);
    return data;
  } catch (error) {
    console.error(`Error fetching movies for country ${slug}:`, error.message);
    const cached = await readJsonFile(filePath);
    return cached || { data: { items: [], totalPages: 0 } };
  }
}

async function searchMovies(keyword, params = {}) {
  const filePath = path.join(TMP_DIR, `search_${keyword}_${JSON.stringify(params)}.json`);
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

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
    await writeJsonFile(filePath, data);
    return data;
  } catch (error) {
    console.error('Error searching movies:', error.message);
    const cached = await readJsonFile(filePath);
    return cached || { data: { items: [], totalPages: 0 } };
  }
}

async function validateM3u8Link(link, slug, episodeName, serverName) {
  const filePath = path.join(TMP_DIR, `valid_link_${Buffer.from(link).toString('base64')}.json`);
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached && cached.url) {
      console.log(`Using cached valid link: ${cached.url} for episode ${episodeName} (slug: ${slug})`);
      return cached.url;
    }
  }

  for (const subdomain of SERVER_SUBDOMAINS) {
    const url = link.replace(/s\d\.phim1280\.tv/, `${subdomain}.phim1280.tv`);
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'Referer': 'https://phimapi.com',
          'Origin': 'https://phimapi.com',
          'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL',
          'Connection': 'keep-alive'
        }
      });
      const contentType = response.headers['content-type'] || '';
      if (
        contentType.includes('application/vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegURL') ||
        response.status === 200
      ) {
        await writeJsonFile(filePath, { url });
        console.log(`Valid m3u8 link found: ${url} for episode ${episodeName} in server ${serverName} (slug: ${slug})`);
        return url;
      }
      console.warn(`Invalid Content-Type for ${url}: ${contentType} (episode: ${episodeName}, server: ${serverName}, slug: ${slug})`);
    } catch (error) {
      console.warn(`Failed to validate ${url} for episode ${episodeName} in server ${serverName} (slug: ${slug}): ${error.message}`);
    }
  }

  // Fallback: Thử link gốc
  try {
    const response = await axios.head(link, { timeout: 10000 });
    if (response.status === 200) {
      await writeJsonFile(filePath, { url: link });
      console.log(`Fallback: Valid original link: ${link} for episode ${episodeName} (slug: ${slug})`);
      return link;
    }
  } catch (error) {
    console.warn(`Fallback check failed for ${link}: ${error.message} (episode: ${episodeName}, slug: ${slug})`);
  }

  console.error(`No valid m3u8 link found for episode ${episodeName} in server ${serverName} (slug: ${slug})`);
  return null;
}

async function getMovieDetail(slug) {
  const filePath = path.join(TMP_DIR, `movie_${slug}.json`);
  if (!(await shouldUpdateFile(filePath))) {
    const cached = await readJsonFile(filePath);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/phim/${slug}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Referer': 'https://phimapi.com'
      }
    });
    const data = response.data || null;
    if (data && data.episodes && data.episodes.length > 0) {
      for (const server of data.episodes) {
        if (!server.server_data || server.server_data.length === 0) {
          console.warn(`No items in server ${server.server_name} for slug: ${slug}`);
          continue;
        }
        console.log(`Found ${server.server_data.length} episodes in server ${server.server_name} for slug: ${slug}`);
        for (const item of server.server_data) {
          if (item.link_m3u8 && item.link_m3u8.startsWith('http')) {
            const validLink = await validateM3u8Link(item.link_m3u8, slug, item.name, server.server_name);
            item.link_m3u8 = validLink || item.link_m3u8;
            console.log(`Processed link for episode ${item.name}: ${item.link_m3u8}`);
          } else if (item.link && item.link.endsWith('.mp4')) {
            item.link_mp4 = item.link;
            console.log(`Found MP4 link for episode ${item.name}: ${item.link_mp4}`);
          } else {
            console.warn(`Invalid m3u8 link for episode ${item.name} in server ${server.server_name} for slug: ${slug}`);
          }
        }
      }
      await writeJsonFile(filePath, data);
    } else {
      console.warn(`No episodes or data for slug: ${slug}`);
    }
    return data;
  } catch (error) {
    console.error(`Error fetching movie detail for slug ${slug}:`, error.message);
    const cached = await readJsonFile(filePath);
    return cached || null;
  }
}

module.exports = { getCategories, getCountries, getNewMovies, getMoviesByCategory, getMoviesByCountry, searchMovies, getMovieDetail };
