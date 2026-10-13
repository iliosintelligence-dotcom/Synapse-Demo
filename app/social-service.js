/**
 * Synapse Social Service client — connections and publishing only.
 *
 * Development mode: requests go directly to the NestJS API.
 * Do not embed an API key in this browser module.
 * The NestJS API must permit this origin via CORS and authorize requests
 * through a browser-safe mechanism for this to work.
 *
 * This module deliberately does NOT implement tracked-link generation:
 * the supplied OpenAPI schema has no short-link creation endpoint.
 */
const BASE = 'https://synapse-social-service.onrender.com/api/v1';
const API_KEY = 'syn_a228be02f55be5eeb681d5a6b5032868c880d6b495aef284a8d55d34f375356b';
const PLATFORMS = new Set(['facebook', 'instagram', 'tiktok', 'telegram', 'youtube', 'x']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUUID(value, field = 'id') {
  if (!UUID.test(String(value))) throw new TypeError(`${field} must be a UUID`);
  return value;
}
function assertPlatform(platform) {
  if (!PLATFORMS.has(platform)) throw new TypeError('Unsupported social platform');
  return platform;
}
function query(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, String(v)); });
  return q.toString() ? `?${q}` : '';
}
async function request(path, { method = 'GET', body, signal } = {}) {
  const options = { method, credentials: 'omit', headers: { Accept: 'application/json', 'X-API-KEY': API_KEY }, signal };
  if (body !== undefined) {
    if (body instanceof FormData) options.body = body;
    else { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
  }
  const response = await fetch(`${BASE}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');
  if (!response.ok) {
    const message = result && typeof result === 'object'
      ? (Array.isArray(result.message) ? result.message.join('; ') : result.message || result.error)
      : result;
    const error = new Error(message || `Social Service request failed (${response.status})`);
    error.status = response.status;
    error.details = result;
    throw error;
  }
  return result;
}

export const socialConnections = Object.freeze({
  platforms: () => request('/platforms'),
  authorize: (platform, returnUrl = window.location.origin + window.location.pathname) => request(`/connections/authorize${query({ platform: assertPlatform(platform), returnUrl })}`),
  handoff: (ticket) => {
    if (!/^[0-9a-f]{64}$/i.test(String(ticket))) throw new TypeError('Invalid OAuth handoff ticket');
    return request(`/connections/handoff${query({ ticket })}`);
  },
  callback: (platform, { code, state, error } = {}) => {
    assertPlatform(platform);
    if (!state) throw new TypeError('OAuth state is required');
    return request(`/connections/callback/${encodeURIComponent(platform)}${query({ code, state, error })}`);
  },
  complete: (pendingConnectionId, accountIds) => {
    assertUUID(pendingConnectionId, 'pendingConnectionId');
    if (!Array.isArray(accountIds) || !accountIds.length || accountIds.some(id => !String(id).trim()))
      throw new TypeError('Select at least one social account');
    return request('/connections/complete', { method: 'POST', body: { pendingConnectionId, accountIds } });
  },
  summary: () => request('/connections/summary'),
  list: ({ platform, status } = {}) => request(`/connections${query({ platform: platform && assertPlatform(platform), status })}`),
  get: (id) => request(`/connections/${assertUUID(id)}`),
  disconnect: (id) => request(`/connections/${assertUUID(id)}`, { method: 'DELETE' }),
  validate: (id) => request(`/connections/${assertUUID(id)}/validate`, { method: 'POST' }),
  reconnect: (id) => request(`/connections/${assertUUID(id)}/reconnect`, { method: 'POST' }),
  accounts: (id) => request(`/connections/${assertUUID(id)}/accounts`),
  discoverAccounts: (id) => request(`/connections/${assertUUID(id)}/accounts/discover`, { method: 'POST' }),
  capabilities: (id) => request(`/connections/${assertUUID(id)}/accounts/capabilities`),
});

export const socialPublishing = Object.freeze({
  createPost: ({ caption, campaignId, metadata } = {}) => {
    if (!caption || typeof caption !== 'string' || caption.length > 10000) throw new TypeError('Invalid caption');
    if (campaignId) assertUUID(campaignId, 'campaignId');
    return request('/posts', { method: 'POST', body: { caption, ...(campaignId ? { campaignId } : {}), ...(metadata ? { metadata } : {}) } });
  },
  getPost: (id) => request(`/posts/${assertUUID(id)}`),
  updatePost: (id, changes) => request(`/posts/${assertUUID(id)}`, { method: 'PATCH', body: changes }),
  postPublications: (id) => request(`/posts/${assertUUID(id)}/publications`),
  addMedia: (id, files) => {
    const data = new FormData();
    for (const file of files) data.append('files', file);
    return request(`/posts/${assertUUID(id)}/media`, { method: 'POST', body: data });
  },
  publish: ({ postId, connectionIds, campaignId } = {}) => {
    assertUUID(postId, 'postId');
    if (!Array.isArray(connectionIds) || !connectionIds.length || connectionIds.length > 20)
      throw new TypeError('Select between 1 and 20 connections');
    connectionIds.forEach(id => assertUUID(id, 'connectionId'));
    if (campaignId) assertUUID(campaignId, 'campaignId');
    return request('/publications/publish', { method: 'POST', body: { postId, connectionIds, ...(campaignId ? { campaignId } : {}) } });
  },
  schedule: ({ postId, connectionId, scheduledAt, campaignId } = {}) => {
    assertUUID(postId, 'postId'); assertUUID(connectionId, 'connectionId');
    if (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) <= Date.now())
      throw new TypeError('scheduledAt must be a future date and time with timezone');
    if (campaignId) assertUUID(campaignId, 'campaignId');
    return request('/publications/schedule', { method: 'POST', body: { postId, connectionId, scheduledAt, ...(campaignId ? { campaignId } : {}) } });
  },
  bulkSchedule: (items) => request('/publications/bulk-schedule', { method: 'POST', body: { items } }),
  reschedule: (id, scheduledAt) => request(`/publications/${assertUUID(id)}/schedule`, { method: 'PATCH', body: { scheduledAt } }),
  cancel: (id) => request(`/publications/${assertUUID(id)}/schedule`, { method: 'DELETE' }),
  getPublication: (id) => request(`/publications/${assertUUID(id)}`),
  retry: (id) => request(`/publications/${assertUUID(id)}/retry`, { method: 'POST' }),
});

export default Object.freeze({ connections: socialConnections, publishing: socialPublishing });
