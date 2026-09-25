import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { toast } from '../components/ui.js';
import { setPageTitle } from '../components/layout.js';

// US-47: lễ tân/quản lý xem hội thoại khách hàng và trả lời — polling 4s
// (real-time ở mức vận hành, không cần websocket trong phạm vi này).
export async function renderStaffChat(container) {
  setPageTitle('Chat hỗ trợ');
  showLoading(container);

  let conversations = [];
  let activeId = null;
  let pollTimer = null;

  const listEl = el('div', { class: 'chat-conversations' });
  const messagesEl = el('div', { class: 'chat-list' }, el('div', { class: 'empty-state' }, el('p', {}, 'Chọn một hội thoại để xem tin nhắn.')));
  const replyForm = el('form', { class: 'chat-form', style: { display: 'none' } },
    el('input', { name: 'noi_dung', required: true, placeholder: 'Nhập câu trả lời cho khách…' }),
    el('button', { class: 'btn btn-primary', type: 'submit' }, 'Gửi'));
  const threadTitle = el('div', { class: 'chat-thread-title', style: { fontWeight: '600' } }, 'Hội thoại');

  const page = el('div', { class: 'chat-page' },
    listEl,
    el('div', { class: 'chat-thread' }, threadTitle, messagesEl, replyForm));
  clear(container).appendChild(page);

  const loadConversations = async () => {
    const res = await api.get('/chat/conversations');
    conversations = res.data || [];
    clear(listEl);
    if (!conversations.length) {
      listEl.appendChild(el('div', { class: 'empty-state' }, el('p', {}, 'Chưa có hội thoại nào từ khách hàng.')));
      return;
    }
    conversations.forEach(conv => {
      const item = el('button', { type: 'button', class: 'chat-conversation-item' + (conv.id === activeId ? ' active' : '') },
        el('span', { class: 'name' }, conv.ten_khach || 'Khách #' + conv.khach_hang_id),
        el('span', { class: 'meta' },
          el('span', {}, conv.trang_thai === 'Pending' ? 'Chờ trả lời' : 'Đã trả lời'),
          Number(conv.unread_count) > 0 ? el('span', { class: 'badge badge-danger' }, String(conv.unread_count) + ' mới') : null)
      );
      item.addEventListener('click', () => { activeId = conv.id; renderThread(); loadConversations(); });
      listEl.appendChild(item);
    });
  };

  const renderThread = async () => {
    const conv = conversations.find(c => c.id === activeId);
    threadTitle.textContent = conv ? `Hội thoại với ${conv.ten_khach || 'khách #' + conv.khach_hang_id}` : 'Hội thoại';
    replyForm.style.display = activeId ? 'flex' : 'none';
    if (!activeId) return;
    try {
      const res = await api.get(`/chat/conversations/${activeId}/messages`);
      const rows = res.data?.messages || [];
      clear(messagesEl);
      if (!rows.length) {
        messagesEl.appendChild(el('div', { class: 'empty-state' }, el('p', {}, 'Chưa có tin nhắn.')));
        return;
      }
      rows.forEach(m => messagesEl.appendChild(
        el('div', { class: 'chat-message ' + (m.sender_role === 'Staff' ? 'mine' : '') }, m.noi_dung)));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      await api.post(`/chat/conversations/${activeId}/mark-read`).catch(() => {});
    } catch (error) {
      clear(messagesEl).appendChild(el('div', { class: 'error-state' }, el('p', {}, error.message)));
    }
  };

  replyForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!activeId) return;
    const input = replyForm.elements.noi_dung;
    try {
      await api.post(`/chat/conversations/${activeId}/reply`, { noi_dung: input.value });
      input.value = '';
      await renderThread();
      await loadConversations();
    } catch (error) { toast(error.message, 'error'); }
  });

  await loadConversations();
  pollTimer = setInterval(async () => {
    await loadConversations();
    if (activeId) await renderThread();
  }, 4000);
  window.addEventListener('hashchange', () => clearInterval(pollTimer), { once: true });
}
