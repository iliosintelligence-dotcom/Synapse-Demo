import axios from "https://cdn.jsdelivr.net/npm/axios@1/+esm";

import { apiKey, baseUrl } from '../configs';

const api = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": apiKey
    },
});

export const get = (url, config = {}) =>
    api.get(url, config);

export const post = (url, data = {}, config = {}) =>
    api.post(url, data, config);

export const patch = (url, data = {}, config = {}) =>
    api.patch(url, data, config);

export const put = (url, data = {}, config = {}) =>
    api.put(url, data, config);

export const del = (url, config = {}) =>
    api.delete(url, config);

export default api;
