const $ = (sel) => document.querySelector(sel);
const logEl = $('#event-log');
const statusEl = $('#connection-status');
const roleBadge = $('#role-badge');
const sendPanel = $('#send-panel');
const sendHint = $('#send-hint');
const sendBtn = $('#send-btn');

let role = 'hub';
let deviceId = '';
let ws = null;
let bytesSaved = 0;

const ICONS = {
  hub: '<svg class="device-icon" viewBox="0 0 48 48"><rect x="8" y="14" width="32" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="36" x2="32" y2="36" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="8" r="4" fill="currentColor"/></svg>',
  laptop: '<svg class="device-icon" viewBox="0 0 48 48"><rect x="10" y="12" width="28" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 34 h36 l-4 6 h-28 z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  phone: '<svg class="device-icon" viewBox="0 0 48 48"><rect x="16" y="6" width="16" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="36" r="2" fill="currentColor"/></svg>',
  'phone-blocked': '<svg class="device-icon" viewBox="0 0 48 48"><rect x="16" y="6" width="16" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="14" x2="34" y2="34" stroke="currentColor" stroke-width="2.5"/></svg>',
};

async function init() {
  const [topo, status] = await Promise.all([
    fetch('/api/topology').then((r) => r.json()),
    fetch('/api/status').then((r) => r.json()),
  ]);

  role = topo.role || status.role || 'hub';
  deviceId = status.device_id || status.hub_id || '';

  renderTopology(topo.devices, status);
  updateStats(status);
  configureSendPanel(status);

  if (role === 'hub') {
    connectWebSocket();
    statusEl.textContent = 'Hub Dashboard — Live';
    statusEl.classList.add('connected');
  } else {
    statusEl.textContent = `Node: ${status.device_name || deviceId}`;
    statusEl.classList.add('node');
    pollNodeEvents();
  }

  roleBadge.textContent = role === 'hub'
    ? 'Viewing as: Hub Controller (Laptop A)'
    : `Viewing as: ${status.device_name} (${deviceId})`;

  $('#device-info').textContent = deviceId ? `Device: ${deviceId}` : '';
  setInterval(refreshStatus, 3000);
}

function renderTopology(devices, status) {
  const peers = new Set((status.peers || []).map((p) => p.device_id));
  const grid = $('#topology-grid');
  grid.innerHTML = devices.map((d) => {
    const isCurrent = d.device_id === deviceId || (role === 'hub' && d.device_id === 'laptop-a');
    const online = peers.has(d.device_id) || (role === 'hub' && d.device_id === 'laptop-a');
    const blocked = !d.authorized;
    let statusClass = online ? 'online' : 'offline';
    let statusText = online ? 'ONLINE' : 'OFFLINE';
    if (blocked && online) { statusClass = 'denied'; statusText = 'DENIED'; }
    if (blocked && !online && role !== 'hub') { statusText = 'BLOCKED'; statusClass = 'denied'; }

    return `
      <div class="device-card ${blocked ? 'blocked' : ''} ${online ? 'online' : ''} ${isCurrent ? 'current' : ''}">
        ${ICONS[d.icon] || ICONS.laptop}
        <h3>${d.device_name}</h3>
        <div class="role">${d.role}</div>
        <div class="desc">${d.description}</div>
        <span class="device-status ${statusClass}">${statusText}</span>
      </div>`;
  }).join('');
}

function configureSendPanel(status) {
  const isNode = role === 'node';
  const authorized = status.authorized !== false && status.policy_result !== 'DENY';

  if (!isNode) {
    sendHint.textContent = 'Open Laptop B (:8081) or Phone A (:8083) in another tab/device to send packets.';
    sendBtn.disabled = true;
    return;
  }

  if (!authorized) {
    sendHint.textContent = 'This device is unauthorized — packets will be denied by the policy engine (demo the block!).';
    sendBtn.disabled = false;
    sendBtn.textContent = 'Attempt Send (will be denied)';
  } else {
    sendHint.textContent = 'Payload is compressed → encrypted (AES-GCM) → signed (Ed25519) → sent over raw UDP.';
    sendBtn.disabled = false;
  }
}

function connectWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws/events`);
  ws.onmessage = (e) => {
    const event = JSON.parse(e.data);
    appendLog(event);
    updateStatsFromEvent(event);
  };
  ws.onclose = () => setTimeout(connectWebSocket, 2000);
}

async function pollNodeEvents() {
  const events = await fetch('/api/events').then((r) => r.json());
  logEl.innerHTML = '';
  (events.events || []).forEach(appendLog);
  setInterval(async () => {
    const res = await fetch('/api/events').then((r) => r.json());
    const newEvents = res.events || [];
    if (newEvents.length > logEl.children.length) {
      newEvents.slice(logEl.children.length).forEach(appendLog);
    }
  }, 1500);
}

async function refreshStatus() {
  const status = await fetch('/api/status').then((r) => r.json());
  const topo = await fetch('/api/topology').then((r) => r.json());
  renderTopology(topo.devices, status);
  updateStats(status);
}

function updateStats(status) {
  const stats = status.stats || {};
  $('#stat-packets').textContent = stats.packets_forwarded ?? stats.packets_total ?? 0;
  $('#stat-denied').textContent = stats.packets_denied ?? 0;
  $('#stat-peers').textContent = (status.peers || []).length;
  $('#stat-bytes').textContent = bytesSaved;
}

function updateStatsFromEvent(event) {
  if (event.stats) {
    const saved = (event.stats.original_bytes || 0) - (event.stats.compressed_bytes || 0);
    if (saved > 0) bytesSaved += saved;
    $('#stat-bytes').textContent = bytesSaved;
  }
  if (event.kind === 'packet' && event.policy === 'ALLOW') {
    const el = $('#stat-packets');
    el.textContent = parseInt(el.textContent) + 1;
  }
  if (event.kind === 'deny') {
    const el = $('#stat-denied');
    el.textContent = parseInt(el.textContent) + 1;
  }
}

function appendLog(event) {
  const kind = event.kind || 'info';
  const time = (event.timestamp || new Date().toISOString()).slice(11, 19);
  const policy = event.policy
    ? `<span class="policy-${event.policy === 'ALLOW' ? 'allow' : 'deny'}">[${event.policy}]</span> `
    : '';
  const stats = event.stats
    ? `<div class="stats">original: ${event.stats.original_bytes}B → compressed: ${event.stats.compressed_bytes}B → encrypted: ${event.stats.encrypted_bytes}B (seq ${event.stats.sequence})</div>`
    : '';

  const entry = document.createElement('div');
  entry.className = `log-entry ${kind}`;
  entry.innerHTML = `<span class="time">${time}</span>${policy}<span class="device">${event.device_name || event.device_id || 'system'}</span> — ${event.message || ''}${stats}`;
  logEl.prepend(entry);
  while (logEl.children.length > 80) logEl.removeChild(logEl.lastChild);
}

sendBtn.addEventListener('click', async () => {
  const message = $('#message-input').value.trim();
  if (!message) return;
  const target_id = $('#target-select').value;
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, target_id }),
  }).then((r) => r.json());
  if (res.stats) {
    appendLog({
      kind: 'packet',
      device_name: deviceId,
      message: `Sent: ${message}`,
      policy: 'SENT',
      stats: res.stats,
      timestamp: new Date().toISOString(),
    });
  }
  $('#message-input').value = '';
});

document.querySelectorAll('.scenario-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $('#message-input').value = btn.dataset.msg;
    if (role === 'node') sendBtn.click();
  });
});

init();
