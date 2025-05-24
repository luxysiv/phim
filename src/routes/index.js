const express = require('express');
const router = express.Router();
const { getCategories, getCountries, getNewMovies, getMoviesByCategory, getMoviesByCountry, searchMovies, getMovieDetail } = require('../services/phimapi');

const CDN_IMAGE = 'https://phimimg.com';

async function getProviderData() {
  const categories = await getCategories();
  const countries = await getCountries();
  const moviesData = await getNewMovies(1, 20);
  const movies = moviesData.items || [];

  const categoryList = categories.map((cat) => ({
    text: cat.name || 'Unknown Category',
    type: 'radio',
    url: `https://phim-kappa.vercel.app/sort/category?uid=${cat.slug || 'unknown'}`
  }));
  const countryList = countries.map((country) => ({
    text: country.name || 'Unknown Country',
    type: 'radio',
    url: `https://phim-kappa.vercel.app/sort/nation?uid=${country.slug || 'unknown'}`
  }));

  const enrichedMovies = await enrichMovies(movies);
  const moviesList = mapToChannels(enrichedMovies);

  return {
    name: 'Phim Kappa',
    id: 'phimkappa',
    url: 'https://phim-kappa.vercel.app',
    color: '#0f172a',
    image: {
      url: 'https://phim-kappa.vercel.app/public/logo.png',
      type: 'cover'
    },
    description: 'Phim Kappa - Kho phim trực tuyến miễn phí với hàng ngàn bộ phim bom tấn, phim độc lập, phim Hàn, Âu Mỹ, hoạt hình, cập nhật mới nhất, chất lượng FHD, hỗ trợ Vietsub và Lồng Tiếng.',
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
      },
      {
        text: 'Quốc gia',
        type: 'dropdown',
        value: countryList
      }
    ],
    grid_number: 3,
    movies: moviesList // Đổi từ channels thành movies để tương thích MonPlayer
  };
}

async function enrichMovies(movies) {
  return Promise.all(movies.map(async (movie) => {
    const detail = await getMovieDetail(movie.slug);
    return {
      ...movie,
      description: detail?.movie?.content || detail?.movie?.description || 'Không có mô tả chi tiết.',
      type: detail?.movie?.type || 'series'
    };
  }));
}

function mapToChannels(movies) {
  return movies.map((movie) => {
    const id = movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`;
    const imageUrl = movie.poster_url || movie.thumb_url;
    const isSeries = ['series', 'hoathinh'].includes(movie.type);
    return {
      id,
      title: movie.name || movie.title || 'Unknown Title',
      description: movie.description || movie.content || 'Không có mô tả chi tiết.',
      thumbnail: imageUrl && !imageUrl.startsWith('http') ? `${CDN_IMAGE}/${imageUrl}` : imageUrl || 'https://via.placeholder.com/200x300',
      category: movie.category?.[0]?.name || 'Không xác định',
      genres: movie.category?.map(cat => cat.name) || [],
      type: isSeries ? 'series' : 'movie',
      year: movie.year || 'N/A',
      duration: movie.time || 'N/A',
      remote_data: {
        url: `https://phim-kappa.vercel.app/channel-detail?uid=${movie.slug || id}`
      }
    };
  });
}

router.get('/', async (req, res, next) => {
  try {
    const providerData = await getProviderData();
    res.json({ movies: providerData.movies });
  } catch (error) {
    console.error('Error in / endpoint:', error.message);
    next(error);
  }
});

router.get('/newest', async (req, res, next) => {
  try {
    const moviesData = await getNewMovies(1, 20);
    const movies = moviesData.items || [];
    if (!movies.length) {
      console.warn('No movies found in /newest');
    }
    const enrichedMovies = await enrichMovies(movies);
    const moviesList = mapToChannels(enrichedMovies);
    res.json({ movies: moviesList });
  } catch (error) {
    console.error('Error in /newest endpoint:', error.message);
    next(error);
  }
});

router.get('/sort/category', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }
    const moviesData = await getMoviesByCategory(uid, 1, 20);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for category: ${uid}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const moviesList = mapToChannels(enrichedMovies);
    res.json({ movies: moviesList });
  } catch (error) {
    console.error('Error in /sort/category endpoint:', error.message);
    next(error);
  }
});

router.get('/sort/nation', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }
    const moviesData = await getMoviesByCountry(uid, 1, 20);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for nation: ${uid}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const moviesList = mapToChannels(enrichedMovies);
    res.json({ movies: moviesList });
  } catch (error) {
    console.error('Error in /sort/nation endpoint:', error.message);
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
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
    if (!movies.length) {
      console.warn(`No movies found for keyword: ${keyword}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const moviesList = mapToChannels(enrichedMovies);
    res.json({ movies: moviesList });
  } catch (error) {
    console.error('Error in /search endpoint:', error.message);
    next(error);
  }
});

router.get('/channel-detail', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const movie = await getMovieDetail(uid);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for uid: ${uid}`);
      return res.status(404).json({ error: `Movie not found for uid: ${uid}` });
    }

    const isSeries = ['series', 'hoathinh'].includes(movie.movie.type);
    const imageUrl = movie.movie.poster_url || movie.movie.thumb_url;
    const movieData = {
      id: movie.movie._id,
      title: movie.movie.name || movie.movie.title || 'Unknown Title',
      description: movie.movie.content || movie.movie.description || 'Không có mô tả chi tiết.',
      thumbnail: imageUrl && !imageUrl.startsWith('http') ? `${CDN_IMAGE}/${imageUrl}` : imageUrl || 'https://via.placeholder.com/200x300',
      category: movie.movie.category?.[0]?.name || 'Không xác định',
      genres: movie.movie.category?.map(cat => cat.name) || [],
      year: movie.movie.year || 'N/A',
      duration: movie.movie.time || 'N/A',
      type: isSeries ? 'series' : 'movie',
      episodes: []
    };

    if (movie.episodes && movie.episodes.length > 0) {
      movie.episodes.forEach((server, serverIndex) => {
        server.server_data?.forEach((episode, episodeIndex) => {
          if (episode.link_m3u8 && episode.link_m3u8.startsWith('http')) {
            const normalizedName = episode.name.replace(/^Tập\s+(\d+)$/, 'Tập $1').replace(/^Tập\s+0+(\d+)$/, 'Tập $1');
            const streamId = `${server.server_name}__${normalizedName}__${movie.movie._id}__${serverIndex}_${episodeIndex}`;
            movieData.episodes.push({
              id: streamId,
              title: isSeries ? `${normalizedName} (${server.server_name})` : 'Full',
              remote_data: {
                url: `https://phim-kappa.vercel.app/stream-detail?channelId=${movie.movie._id}&streamId=${streamId}&contentId=${movie.movie._id}&sourceId=${movie.movie._id}`
              }
            });
          }
        });
      });
    }

    if (!movieData.episodes.length) {
      console.warn(`No valid episodes found for uid: ${uid}`);
      return res.status(404).json({ error: `No playable episodes available for ${movie.movie.name}` });
    }

    res.json(movieData);
  } catch (error) {
    console.error('Error in /channel-detail endpoint:', error.message);
    next(error);
  }
});

router.get('/stream-detail', async (req, res, next) => {
  try {
    const { channelId, streamId, contentId, sourceId } = req.query;
    if (!channelId || !streamId || !contentId || !sourceId) {
      console.warn(`Missing parameters in /stream-detail: channelId=${channelId}, streamId=${streamId}, contentId=${contentId}, sourceId=${sourceId}`);
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const movie = await getMovieDetail(channelId);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for channelId: ${channelId}`);
      return res.status(404).json({ error: `Movie not found for channelId: ${channelId}` });
    }

    let episode;
    let serverName;
    let found = false;
    (movie.episodes || []).forEach((server, serverIndex) => {
      (server.server_data || []).forEach((ep, episodeIndex) => {
        const normalizedName = ep.name.replace(/^Tập\s+(\d+)$/, 'Tập $1').replace(/^Tập\s+0+(\d+)$/, 'Tập $1');
        const expectedStreamId = `${server.server_name}__${normalizedName}__${movie.movie._id}__${serverIndex}_${episodeIndex}`;
        if (expectedStreamId === streamId || streamId.includes(`${server.server_name}__${normalizedName}__${movie.movie._id}`)) {
          episode = ep;
          serverName = server.server_name;
          found = true;
        }
      });
    });

    if (!found || !episode || !episode.link_m3u8 || !episode.link_m3u8.startsWith('http')) {
      console.warn(`Invalid episode or m3u8 link for streamId: ${streamId} in channelId: ${channelId}`);
      return res.status(404).json({ error: `Invalid stream for streamId: ${streamId}` });
    }

    res.json({
      stream_links: [
        {
          id: "default",
          name: "default",
          type: "hls",
          default: false,
          url: episode.link_m3u8
        }
      ]
    });
  } catch (error) {
    console.error('Error in /stream-detail endpoint:', error.message);
    next(error);
  }
});

router.get('/share-channel', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    const movie = await getMovieDetail(uid);
    if (!movie || !movie.movie) {
      console.warn(`No movie details found for uid: ${uid}`);
      return res.status(404).json({ error: `Movie not found for uid: ${uid}` });
    }

    const providerData = await getProviderData();
    const isSeries = ['series', 'hoathinh'].includes(movie.movie.type);

    const channel = {
      id: movie.movie._id || `movie-${Math.random().toString(36).substr(2, 9)}`,
      title: movie.movie.name || movie.movie.title || 'Unknown Title',
      description: movie.movie.content || movie.movie.description || 'Không có mô tả chi tiết.',
      thumbnail: movie.movie.poster_url || movie.movie.thumb_url || 'https://via.placeholder.com/200x300',
      type: isSeries ? 'series' : 'movie',
      remote_data: {
        url: `https://phim-kappa.vercel.app/channel-detail?uid=${uid}`
      },
      share: {
        url: `https://phim-kappa.vercel.app/share-channel?uid=${uid}`
      }
    };

    res.json({
      channel,
      provider: providerData
    });
  } catch (error) {
    console.error('Error in /share-channel endpoint:', error.message);
    next(error);
  }
});

router.get('/group-cate', async (req, res, next) => {
  try {
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }
    const moviesData = await getMoviesByCategory(uid, 1, 20);
    const movies = moviesData.data?.items || [];
    if (!movies.length) {
      console.warn(`No movies found for category: ${uid}`);
    }
    const enrichedMovies = await enrichMovies(movies);
    const moviesList = mapToChannels(enrichedMovies);
    res.json({ movies: moviesList });
  } catch (error) {
    console.error('Error in /group-cate endpoint:', error.message);
    next(error);
  }
});

module.exports = router;
