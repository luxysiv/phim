const axios = require('axios');

const BASE_URL = 'https://phimapi.com';

// Lấy danh sách thể loại
async function getCategories() {
  try {
    const response = await axios.get(`${BASE_URL}/the-loai`);
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
}

// Lấy danh sách quốc gia
async function getCountries() {
  try {
    const response = await axios.get(`${BASE_URL}/quoc-gia`);
    return response.data;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    return [];
  }
}

module.exports = { getCategories, getCountries };
