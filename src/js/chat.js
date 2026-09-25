// === CHAT HỖ TRỢ (US-47): widget nổi góc phải — khách đã đăng nhập chat với lễ tân ===
let chatOpen = false;
let chatPollTimer = null;
let chatUnread = 0;
let chatLoadingHistory = false;

const renderChatWidget = () => {
    if (document.getElementById('chat-launcher')) return;

    const widget = document.createElement('div');
    widget.id = 'chat-widget-root';
    widget.innerHTML = `
        <!-- Panel -->
        <div id="chat-panel" class="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden hidden" style="max-height: 480px;">
            <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                        <i class="fas fa-headset"></i>
                    </div>
                    <div>
                        <p class="font-bold text-sm">HoangAn Support</p>
                        <p class="text-[10px] text-white/80">Lễ tân trả lời trong giờ làm việc 7h30 → 21h</p>
                    </div>
                </div>
                <button onclick="toggleChat()" class="text-white/80 hover:text-white transition"><i class="fas fa-times"></i></button>
            </div>
            <div id="chat-messages" class="px-4 py-4 space-y-3 overflow-y-auto bg-gray-50" style="height: 300px;">
                <p class="text-center text-gray-400 text-sm">Chưa có tin nhắn nào. Hãy gửi câu hỏi đầu tiên!</p>
            </div>
            <form id="chat-form" class="p-3 border-t border-gray-100 flex gap-2 bg-white" onsubmit="sendChatMessage(event)">
                <input type="text" id="chat-input" placeholder="Nhập câu hỏi…" class="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm">
                <button type="submit" class="bg-primary text-white px-4 rounded-lg hover:bg-indigo-600 transition"><i class="fas fa-paper-plane"></i></button>
            </form>
        </div>

        <!-- Launcher -->
        <button id="chat-launcher" onclick="toggleChat()" class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition duration-300 flex items-center justify-center">
            <i id="chat-launcher-icon" class="fas fa-comments text-xl"></i>
            <span id="chat-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full items-center justify-center"></span>
        </button>
    `;
    document.body.appendChild(widget);
};

const toggleChat = () => {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chat-panel');
    const icon = document.getElementById('chat-launcher-icon');
    if (!panel) return;
    if (chatOpen) {
        panel.classList.remove('hidden');
        icon.className = 'fas fa-chevron-down text-xl';
        chatUnread = 0;
        updateChatBadge();
        if (currentCustomer) {
            loadChatMessages();
            chatPollTimer = setInterval(loadChatMessages, 5000);
        }
    } else {
        panel.classList.add('hidden');
        icon.className = 'fas fa-comments text-xl';
        if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
    }
};

const updateChatBadge = () => {
    const badge = document.getElementById('chat-badge');
    if (!badge) return;
    if (chatUnread > 0 && !chatOpen) {
        badge.textContent = chatUnread > 9 ? '9+' : String(chatUnread);
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
};

const escapeChat = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const renderChatMessages = (messages) => {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    if (!messages.length) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm">Chưa có tin nhắn nào. Hãy gửi câu hỏi đầu tiên!</p>';
        return;
    }
    list.innerHTML = messages.map(m => {
        const mine = m.sender_role === 'Customer';
        return `
            <div class="flex ${mine ? 'justify-end' : 'justify-start'}">
                <div class="${mine
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm'} px-4 py-2 max-w-[80%] text-sm">
                    ${escapeChat(m.noi_dung)}
                    <div class="${mine ? 'text-white/70' : 'text-gray-400'} text-[10px] mt-1">${m.thoi_gian ? new Date(m.thoi_gian).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </div>
            </div>
        `;
    }).join('');
    list.scrollTop = list.scrollHeight;
};

const loadChatMessages = async (countUnread = false) => {
    if (chatLoadingHistory) return;
    chatLoadingHistory = true;
    try {
        const res = await API.get('/chat/messages');
        const messages = res.data?.messages || [];
        const conversation = res.data?.conversation;
        renderChatMessages(messages);
        if (countUnread && !chatOpen) {
            chatUnread = messages.filter(m => m.sender_role !== 'Customer' && !m.da_doc).length;
            updateChatBadge();
        }
        if (conversation && chatOpen) {
            API.post(`/chat/conversations/${conversation.id}/mark-read`, {}).catch(() => {});
        }
    } catch { /* khách chưa đăng nhập hoặc offline — widget tĩnh */ }
    finally { chatLoadingHistory = false; }
};

const sendChatMessage = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    if (!currentCustomer) {
        showToast('Vui lòng đăng nhập để trò chuyện với lễ tân', 'warning');
        showCustomerLogin();
        return;
    }
    input.value = '';
    try {
        await API.post('/chat/messages', { noi_dung: text });
        await loadChatMessages();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Khởi tạo widget sau khi trang tải xong; kiểm tra tin nhắn chưa đọc mỗi 30s
// cho khách đã đăng nhập (badge thông báo khi panel đóng).
document.addEventListener('DOMContentLoaded', () => {
    renderChatWidget();
    setInterval(() => {
        if (currentCustomer && !chatOpen) loadChatMessages(true);
    }, 30000);
});
