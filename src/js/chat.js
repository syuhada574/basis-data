import { supabase } from './supabase.js';
import { Toast } from './toast.js';

/**
 * Chat module (audited)
 * ---------------------
 * Only writes to the documented messages columns:
 *   sender_id, receiver_id, order_id, content
 * (is_read, created_at, id are managed by the database).
 *
 * Validates sender_id, receiver_id (or order_id) and content
 * before every insert. Logs to console.error on any failure.
 */
const Chat = {
  currentChatId: null,    // recipient_id (direct chat)
  currentOrderId: null,   // order_id (order-scoped chat)
  messagesContainer: null,
  inputEl: null,
  currentUserId: null,
  _isNearBottom: true,
  _realtimeChannel: null,

  async init(chatId, containerId, options) {
    if (arguments.length < 2) {
      console.error('[Chat.init] missing required arguments');
      return;
    }
    options = options || {};
    this.currentChatId = chatId || null;
    this.currentOrderId = options.order_id || null;
    this.messagesContainer = document.getElementById(containerId);
    this.inputEl = document.getElementById('chat-input');

    if (!this.messagesContainer) {
      console.error('[Chat.init] container #' + containerId + ' not found');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    this.currentUserId = user ? user.id : null;

    if (!this.currentUserId) {
      console.error('[Chat.init] no authenticated user');
      return;
    }
    if (!this.currentOrderId && !this.currentChatId) {
      console.error('[Chat.init] missing recipient_id and order_id');
      return;
    }

    await this.loadMessages();
    this.setupRealtime();
    this.bindScrollTracking();

    if (this.inputEl) this.inputEl.focus();
  },

  bindScrollTracking() {
    if (!this.messagesContainer) return;
    this.messagesContainer.addEventListener('scroll', () => {
      const el = this.messagesContainer;
      this._isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    });
  },

  async loadMessages() {
    // Direct chat: messages between currentUser and currentChatId (order_id IS NULL).
    // Order-scoped chat: messages with this order_id.
    let msgs = [];
    if (this.currentOrderId) {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, order_id, content, is_read, created_at')
        .eq('order_id', this.currentOrderId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[Chat.loadMessages] order-scoped error:', error);
        Toast.error('Gagal memuat pesan: ' + error.message);
        return;
      }
      msgs = data || [];
    } else if (this.currentChatId) {
      // Direct chat: get messages where (sender=me AND receiver=other) OR
      // (sender=other AND receiver=me) AND order_id IS NULL.
      const me = this.currentUserId;
      const other = this.currentChatId;
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, order_id, content, is_read, created_at')
        .or('and(sender_id.eq.' + me + ',receiver_id.eq.' + other + '),and(sender_id.eq.' + other + ',receiver_id.eq.' + me + ')')
        .is('order_id', null)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[Chat.loadMessages] direct chat error:', error);
        Toast.error('Gagal memuat pesan: ' + error.message);
        return;
      }
      msgs = data || [];
    }

    this.renderMessages(msgs);
    this.scrollToBottom();
  },

  scrollToBottom() {
    if (!this.messagesContainer) return;
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  },

  scrollIfNearBottom() {
    if (this._isNearBottom) this.scrollToBottom();
  },

  renderMessages(messages) {
    if (!this.messagesContainer) return;
    if (!messages || messages.length === 0) {
      this.messagesContainer.innerHTML =
        '<div class="empty-state" style="text-align:center; padding:3rem 1.5rem;">' +
          '<div style="font-size:2.5rem; margin-bottom:0.75rem;">&#128172;</div>' +
          '<h4 style="margin:0 0 0.5rem 0; color:#374151;">Belum ada percakapan</h4>' +
          '<p style="color:#9ca3af; margin:0;">Mulailah mengirim pesan.</p>' +
        '</div>';
      return;
    }

    this.messagesContainer.innerHTML = messages.map((msg) => {
      const isSent = msg.sender_id === this.currentUserId;
      const time = new Date(msg.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
      });
      const text = (msg.content == null) ? '' : String(msg.content);
      return (
        '<div class="message ' + (isSent ? 'sent' : 'received') + '" data-msg-id="' + msg.id + '">' +
          '<div class="message-bubble">' +
            '<div class="message-content">' + Chat.escapeHtml(text) + '</div>' +
            '<div class="message-time">' + time + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  },

  escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  async sendMessage() {
    // 1. Read + sanitize content
    const content = (this.inputEl && this.inputEl.value) ? this.inputEl.value.trim() : '';

    // 2. Validate sender
    if (!this.currentUserId) {
      console.error('[Chat.sendMessage] aborted: missing sender_id (not logged in)');
      Toast.error('Anda belum login. Silakan login untuk mengirim pesan.');
      return;
    }

    // 3. Validate recipient (receiver_id is REQUIRED in the messages table)
    if (!this.currentChatId) {
      console.error('[Chat.sendMessage] aborted: receiver_id (currentChatId) is null', {
        sender_id: this.currentUserId,
        receiver_id: this.currentChatId,
        order_id: this.currentOrderId,
        url: (typeof window !== 'undefined') ? window.location.search : ''
      });
      Toast.error('Penerima pesan belum dipilih.');
      return;
    }

    // 4. Validate content
    if (!content) {
      console.error('[Chat.sendMessage] aborted: content is empty');
      Toast.error('Pesan tidak boleh kosong.');
      return;
    }

    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = '...';
    }

    // 5. Build payload with ONLY documented fields.
    //    receiver_id is ALWAYS included (the messages table requires it NOT NULL).
    //    order_id is included only when the chat is order-scoped.
    const payload = {
      sender_id: this.currentUserId,
      receiver_id: this.currentChatId,
      content: content
    };
    if (this.currentOrderId) {
      payload.order_id = this.currentOrderId;
    }

    // 6. Debug log (per spec) and insert
    console.log({
      sender_id: this.currentUserId,
      receiver_id: this.currentChatId,
      order_id: this.currentOrderId,
      url: (typeof window !== 'undefined') ? window.location.search : ''
    });

    const { error } = await supabase.from('messages').insert(payload);

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Kirim';
    }

    if (error) {
      console.error('[Chat.sendMessage] insert failed:', error, { payload });
      Toast.error('Gagal mengirim pesan: ' + error.message);
      return;
    }

    // 7. Clear input on success
    if (this.inputEl) {
      this.inputEl.value = '';
      this.inputEl.style.height = 'auto';
    }
    if (sendBtn) sendBtn.disabled = true;
  },

  setupRealtime() {
    if (this._realtimeChannel) {
      try { supabase.removeChannel(this._realtimeChannel); } catch (e) {}
      this._realtimeChannel = null;
    }
    try {
      this._realtimeChannel = supabase
        .channel('messages_chat_' + (this.currentChatId || this.currentOrderId || 'global'))
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            this.loadMessages();
            this.scrollIfNearBottom();
          }
        )
        .subscribe();
    } catch (e) {
      console.error('[Chat.setupRealtime] subscribe failed:', e);
    }
  }
};

window.Chat = Chat;
export { Chat };
