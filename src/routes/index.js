const express = require('express');
const router = express.Router();
const { getCategories } = require('../services/phimapi');

router.get('/', async (req, res) => {
  // Lấy danh sách thể loại
  const categories = await getCategories();

  // Tạo danh sách thể loại cho JSON
  const categoryList = categories.map((cat) => ({
    text: cat.name,
    type: 'radio',
    url: `https://phimapi.com/v1/api/the-loai/${cat.slug}?page=1&sort_field=_id&sort_type=asc`
  }));

  // JSON trả về
  const response = {
    name: 'MyMoonPlayerAPI',
    id: 'mymoonplayer-api',
    url: 'https://your-vercel-domain.vercel.app', // Thay bằng domain Vercel
    color: '#0f172a',
    image: {
      url: 'https://your-vercel-domain.vercel.app/public/logo.png',
      type: 'cover'
    },
    description: 'Nền tảng xem phim trực tuyến miễn phí, cung cấp kho phim đa dạng, giao diện thân thiện, tốc độ tải nhanh và chất lượng hình ảnh sắc nét.',
    share: {
      url: 'https://your-vercel-domain.vercel.app'
    },
    sorts: [
      {
        text: 'Mới nhất',
        type: 'radio',
        url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1'
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

module.exports = router;
