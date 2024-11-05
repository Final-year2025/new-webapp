// src/config.js
import axios from 'axios';

const pinataApiKey = 'faba4ebc62eb9afea95b';
const pinataSecretApiKey = 'adde355e56922cbf193af6d9d5838ddccbad6fd1bcdab4117dfca64868c6b386';

const pinata = axios.create({
  baseURL: 'https://api.pinata.cloud',
  headers: {
    pinata_api_key: pinataApiKey,
    pinata_secret_api_key: pinataSecretApiKey
  }
});

export { pinata };