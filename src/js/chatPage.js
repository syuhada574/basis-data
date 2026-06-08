import { Auth } from './auth.js';
import { Chat } from './chat.js';
import { Navigation } from './navigation.js';
import { Toast } from './toast.js';
import { supabase } from './supabase.js';

/**
 * Chat page controller (audited + enhanced)
 * ------------------------------
 * - Left pane: list of distinct conversations (counterparty + order/service info + last preview)
 * - Right pane: active chat (header with job link + messages + input + send)
 * - Conversations are grouped by (partnerId, orderId) so same users with different jobs
 *   have separate conversation threads.
 * - Realtime subscription to messages table refreshes the list
 *
 * Reads only documented columns from messages:
 *   id, sender_id, receiver_id, order_id, content, is_read, created_at
 */
let currentUser = null;
let conversations = [];
let activeRecipientId = null;
let activeOrderId = null;
let activeRecipientName = '';
let activeServiceInfo = null; // { title, id, type: 'order'|'service' }
let realtimeChannel = null;
let inputBound = false;

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getInitial(name) {
  if (!name) return '?';
  return String(name).trim().charAt(0).toUpperCase();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimeShort(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
  } catch (e) {
    return '';
  }
}

function setChatHeader(profile, serviceInfo) {
  const name = (profile && profile.name) || activeRecipientName || 'User';
  const avatarEl = document.getElementById('chat-partner-avatar');
  const nameEl = document.getElementById('chat-partner-name');
  const subEl = document.getElementById('chat-partner-sub');
  const jobLinkEl = document.getElementById('chat-job-link');

  if (avatarEl) {
    if (profile && profile.avatar_url) {
      avatarEl.innerHTML = '<img src="' + escapeHtml(profile.avatar_url) + '" alt="">';
    } else {
      avatarEl.textContent = getInitial(name);
    }
  }
  if (nameEl) nameEl.textContent = name;
  if (subEl) {
    subEl.textContent = (profile && profile.role)
      ? (profile.role === 'freelancer' ? 'Freelancer' : 'Customer')
      : 'Online';
  }

  // Show job/service link if this is an order-scoped conversation
  if (jobLinkEl) {
    const info = serviceInfo || activeServiceInfo;
    if (info) {
      jobLinkEl.style.display = 'flex';
      jobLinkEl.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>' +
        '</svg>' +
        '<span>' + escapeHtml(info.title || 'Lihat Detail') + '</span>';
      jobLinkEl.onclick = function () {
        window.open(info.url, '_blank');
      };
    } else {
      jobLinkEl.style.display = 'none';
      jobLinkEl.innerHTML = '';
      jobLinkEl.onclick = null;
    }
  }
}

/**
 * Fetch order details with the associated service title.
 * Returns { title, url, id } or null.
 */
async function fetchOrderServiceInfo(orderId) {
  if (!orderId) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, service_id, status, services:service_id(title)')
      .eq('id', orderId)
      .maybeSingle();
    if (error || !data) return null;
    const serviceTitle = data.services ? data.services.title : 'Pesanan #' + orderId.substring(0, 8);
    return {
      id: orderId,
      title: serviceTitle,
      url: '/src/dashboard.html?orderId=' + orderId
    };
  } catch (e) {
    console.error('[ChatPage.fetchOrderServiceInfo] error:', e);
    return null;
  }
}

async function init() {
  await Navigation.setupForLoggedInPage('chat');
  currentUser = Auth.currentUser;

  if (!currentUser) {
    const empty = document.getElementById('chat-empty-state');
    if (empty) {
      empty.innerHTML =
        '<div class="big-emoji">&#128274;</div>' +
        '<h3>Silakan login</h3>' +
        '<p><a href="/src/login.html" style="color:#4f46e5; font-weight:600;">Login</a> untuk membuka pesan.</p>';
    }
    return;
  }

  activeRecipientId = getQueryParam('recipientId');
  const orderIdParam = getQueryParam('orderId');
  const isFreelancer = currentUser.role === 'freelancer';

  if (orderIdParam) {
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('customer_id, freelancer_id')
      .eq('id', orderIdParam)
      .maybeSingle();
    if (orderErr) {
      console.error('[ChatPage.init] order lookup error:', orderErr);
    }
    if (order) {
      activeRecipientId = currentUser.id === order.customer_id
        ? order.freelancer_id
        : order.customer_id;
      activeOrderId = orderIdParam;
      // Pre-fetch service info for the header
      activeServiceInfo = await fetchOrderServiceInfo(orderIdParam);
    }
  }

  // Freelancer cannot start a new direct chat — only existing conversations
  if (isFreelancer && activeRecipientId && !activeOrderId) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .or('sender_id.eq.' + currentUser.id + ',receiver_id.eq.' + currentUser.id)
      .or('sender_id.eq.' + activeRecipientId + ',receiver_id.eq.' + activeRecipientId)
      .limit(1);
    if (!existing || existing.length === 0) {
      Toast.error('Freelancer tidak dapat membuat chat baru. Chat dibuat oleh customer.');
      activeRecipientId = null;
    }
  }

  await loadConversations();

  const backBtn = document.getElementById('mobile-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      document.getElementById('messages-page').classList.remove('show-chat');
    });
  }

  if (activeRecipientId) {
    await openConversation(activeRecipientId, activeOrderId);
  }

  setupRealtime();
}

async function loadConversations() {
  const list = document.getElementById('conversations-list');
  if (!list) return;

  // Fetch ALL messages where the current user is sender OR receiver.
  const me = currentUser.id;
  const { data: sentMsgs, error: sentErr } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, is_read, created_at, order_id')
    .eq('sender_id', me)
    .order('created_at', { ascending: false });

  const { data: receivedMsgs, error: recvErr } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, is_read, created_at, order_id')
    .eq('receiver_id', me)
    .order('created_at', { ascending: false });

  if (sentErr || recvErr) {
    console.error('[ChatPage.loadConversations]', { sentErr, recvErr });
    list.innerHTML = '<div class="empty-list"><div class="icon">!</div><p>Gagal memuat percakapan.</p></div>';
    return;
  }

  // Dedupe and sort desc by created_at
  const allMap = new Map();
  for (const m of (sentMsgs || [])) allMap.set(m.id, m);
  for (const m of (receivedMsgs || [])) allMap.set(m.id, m);
  const msgs = Array.from(allMap.values()).sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // KEY FIX: Group conversations by (partnerId, orderId) pair.
  // So the same two users can have separate threads for different orders.
  // For direct messages (order_id IS NULL), group by (partnerId, null).
  // For order-scoped messages, group by (partnerId, orderId).
  const conversationMap = new Map();
  for (const m of msgs) {
    const partnerId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
    if (!partnerId) continue;
    const convKey = partnerId + '|' + (m.order_id || 'direct');
    const existing = conversationMap.get(convKey);
    if (!existing || new Date(m.created_at) > new Date(existing.last_at)) {
      conversationMap.set(convKey, {
        otherId: partnerId,
        orderId: m.order_id || null,
        last_message: m,
        last_at: m.created_at,
        unread: (m.receiver_id === currentUser.id && !m.is_read) ? 1 : 0,
        convKey: convKey
      });
    } else if (m.receiver_id === currentUser.id && !m.is_read) {
      existing.unread = (existing.unread || 0) + 1;
    }
  }

  const convKeys = Array.from(conversationMap.keys());
  if (convKeys.length === 0) {
    const emptyMsg = currentUser.role === 'freelancer'
      ? 'Belum ada customer yang menghubungi Anda.'
      : 'Belum ada percakapan. Buka halaman service untuk mulai chat dengan freelancer.';
    list.innerHTML = '<div class="empty-list"><div class="icon">&#128172;</div><p>' + emptyMsg + '</p></div>';
    const sub = document.getElementById('messages-list-sub');
    if (sub) {
      sub.textContent = currentUser.role === 'freelancer'
        ? 'Customer yang menghubungi Anda'
        : 'Percakapan dengan freelancer';
    }
    conversations = [];
    return;
  }

  // Collect unique partner IDs
  const partnerIds = [...new Set(Array.from(conversationMap.values()).map(c => c.otherId))];
  // Collect unique order IDs (excluding direct chats)
  const orderIds = [...new Set(Array.from(conversationMap.values())
    .filter(c => c.orderId)
    .map(c => c.orderId))];

  // Fetch profiles for all partners
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role')
    .in('id', partnerIds);
  if (profErr) {
    console.error('[ChatPage.loadConversations] profiles error:', profErr);
  }
  const profileMap = {};
  (profiles || []).forEach(function (p) { profileMap[p.id] = p; });

  // Fetch order + service info for order-scoped conversations
  let orderServiceMap = {};
  if (orderIds.length > 0) {
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, status, services:service_id(title)')
      .in('id', orderIds);
    if (!ordErr && orders) {
      orders.forEach(function (o) {
        const serviceTitle = o.services ? o.services.title : 'Pesanan #' + o.id.substring(0, 8);
        orderServiceMap[o.id] = {
          title: serviceTitle,
          status: o.status,
          url: '/src/dashboard.html?orderId=' + o.id
        };
      });
    }
  }

  conversations = Array.from(conversationMap.values())
    .map(function (c) {
      const profile = profileMap[c.otherId] || { name: 'User' };
      let serviceInfo = null;
      if (c.orderId && orderServiceMap[c.orderId]) {
        serviceInfo = orderServiceMap[c.orderId];
      }
      return {
        otherId: c.otherId,
        orderId: c.orderId,
        profile: profile,
        serviceInfo: serviceInfo,
        last_message: c.last_message,
        last_at: c.last_at,
        unread: c.unread,
        convKey: c.convKey
      };
    })
    .sort(function (a, b) { return new Date(b.last_at) - new Date(a.last_at); });

  renderConversationsList();
}

function renderConversationsList() {
  const list = document.getElementById('conversations-list');
  if (!list) return;
  const sub = document.getElementById('messages-list-sub');
  if (sub) {
    sub.textContent = currentUser.role === 'freelancer'
      ? 'Customer yang menghubungi Anda'
      : 'Percakapan dengan freelancer';
  }

  if (!conversations.length) {
    list.innerHTML = '<div class="empty-list"><div class="icon">&#128172;</div><p>Belum ada percakapan.</p></div>';
    return;
  }

  list.innerHTML = conversations.map(function (c) {
    const name = c.profile.name || 'User';
    const previewRaw = c.last_message.content || '';
    const preview = previewRaw.length > 60 ? previewRaw.substring(0, 60) + '...' : previewRaw;
    const isActive = c.otherId === activeRecipientId && c.orderId === activeOrderId;

    // Build service badge for order-scoped conversations
    let serviceBadge = '';
    if (c.serviceInfo) {
      serviceBadge =
        '<div class="conv-service-badge" title="' + escapeHtml(c.serviceInfo.title) + '">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>' +
          '</svg>' +
          '<span>' + escapeHtml(c.serviceInfo.title.length > 30 ? c.serviceInfo.title.substring(0, 28) + '...' : c.serviceInfo.title) + '</span>' +
        '</div>';
    }

    return [
      '<div class="conversation-item' + (isActive ? ' active' : '') + '" data-conv-other="' + c.otherId + '" data-conv-order="' + (c.orderId || '') + '">',
        '<div class="conv-avatar">' + escapeHtml(getInitial(name)) + '</div>',
        '<div class="conv-body">',
          '<div class="conv-name">' + escapeHtml(name) + '</div>',
          serviceBadge,
          '<div class="conv-preview">' + escapeHtml(preview || '...') + '</div>',
        '</div>',
        '<div class="conv-meta">',
          '<div>' + escapeHtml(formatTimeShort(c.last_at)) + '</div>',
          c.unread > 0 ? '<span class="conv-unread">' + c.unread + '</span>' : '',
        '</div>',
      '</div>'
    ].join('');
  }).join('');

  list.querySelectorAll('.conversation-item').forEach(function (item) {
    item.addEventListener('click', function () {
      const otherId = item.getAttribute('data-conv-other');
      const orderId = item.getAttribute('data-conv-order') || null;
      openConversation(otherId, orderId);
    });
  });
}

async function openConversation(recipientId, orderId) {
  activeRecipientId = recipientId;
  activeOrderId = orderId || null;

  // Fetch service info for the header if order-scoped
  if (activeOrderId) {
    activeServiceInfo = await fetchOrderServiceInfo(activeOrderId);
  } else {
    activeServiceInfo = null;
  }

  const emptyState = document.getElementById('chat-empty-state');
  const messagesEl = document.getElementById('chat-messages');
  const inputArea = document.getElementById('chat-input-area');
  if (emptyState) emptyState.style.display = 'none';
  if (messagesEl) messagesEl.style.display = 'block';
  if (inputArea) inputArea.style.display = 'flex';

  // Update active state in conversation list
  document.querySelectorAll('.conversation-item').forEach(function (el) {
    const elOther = el.getAttribute('data-conv-other');
    const elOrder = el.getAttribute('data-conv-order') || null;
    el.classList.toggle('active', elOther === recipientId && elOrder === (orderId || null));
  });

  if (window.innerWidth <= 768) {
    document.getElementById('messages-page').classList.add('show-chat');
  }

  // Best effort profile fetch
  let profile = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, role')
      .eq('id', recipientId)
      .maybeSingle();
    profile = data;
  } catch (e) {
    console.error('[ChatPage.openConversation] profile lookup error:', e);
  }
  activeRecipientName = profile ? profile.name : '';
  setChatHeader(profile, activeServiceInfo);

  try {
    await Chat.init(
      recipientId,
      'chat-messages',
      activeOrderId ? { order_id: activeOrderId } : {}
    );
  } catch (e) {
    console.error('[ChatPage.openConversation] Chat.init failed:', e);
    Toast.error('Gagal membuka percakapan.');
    return;
  }

  // Mark unread messages as read
    try {
      let markQuery = supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', currentUser.id)
        .eq('sender_id', recipientId)
        .eq('is_read', false);
      if (activeOrderId) {
        markQuery = markQuery.eq('order_id', activeOrderId);
      } else {
        markQuery = markQuery.is('order_id', null);
      }
      await markQuery;
      // Refresh badge count after marking messages as read
      await Navigation.loadBadges();
    } catch (e) {
      console.error('[ChatPage.openConversation] mark read failed:', e);
    }

  bindInputHandlers();
}

function bindInputHandlers() {
  if (inputBound) return;
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  if (inputEl) {
    inputEl.addEventListener('input', updateSendBtn);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
      }
    });
  }
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMsg);
  }
  inputBound = true;
  // initial state
  setTimeout(updateSendBtn, 50);
  if (inputEl) inputEl.focus();
}

function updateSendBtn() {
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  if (!sendBtn) return;
  const hasText = inputEl && inputEl.value.trim().length > 0;
  sendBtn.disabled = !hasText;
  if (inputEl) {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }
}

async function sendMsg() {
  try {
    await Chat.sendMessage();
  } catch (e) {
    console.error('[ChatPage.sendMsg]', e);
  }
  // Refresh conversation list to update last preview
  setTimeout(function () { loadConversations(); }, 250);
}

function setupRealtime() {
  if (realtimeChannel) {
    try { supabase.removeChannel(realtimeChannel); } catch (e) {}
    realtimeChannel = null;
  }
  try {
    realtimeChannel = supabase
      .channel('messages_page_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        function (payload) {
          // Just refresh the conversation list previews
          loadConversations();
        }
      )
      .subscribe();
  } catch (e) {
    console.error('[ChatPage.setupRealtime] failed:', e);
  }
}

document.addEventListener('DOMContentLoaded', function () { init(); });