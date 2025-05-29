// chat.js - Chat functionality for TechSynergy
class ChatManager {
    constructor() {
        this.currentChat = null;
        this.conversations = [];
        this.socket = null;
        this.user = null;
        this.API_BASE = 'http://localhost:3000/api';
        
        // Initialize
        this.init();
    }

    async init() {
        try {
            // For demo purposes - skip authentication check
            // Get user info
            await this.getUserInfo();

            // Setup event listeners
            this.setupEventListeners();

            // Load conversations
            await this.loadConversations();

            // Setup WebSocket
            this.setupWebSocket();

            console.log('ChatManager initialized successfully');
        } catch (error) {
            console.error('Error initializing ChatManager:', error);
            this.showToast('Failed to initialize chat', 'error');
        }
    }

    async getUserInfo() {
        // For demo purposes - create a mock user
        this.user = {
            _id: 'demo-user',
            name: 'Demo User',
            avatar: '../images/default-avatar.jpg'
        };
        this.updateUserUI();
    }

    updateUserUI() {
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${this.user.avatar}" alt="${this.user.name}">`;
        }
    }

    setupEventListeners() {
        // Chat search
        const chatSearch = document.getElementById('chatSearch');
        if (chatSearch) {
            chatSearch.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchChatTab(tab);
            });
        });

        // New chat modal
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => this.searchUsers(e.target.value));
        }

        // Create group form
        const createGroupForm = document.getElementById('createGroupForm');
        if (createGroupForm) {
            createGroupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createGroup();
            });
        }
    }

    async loadConversations() {
        try {
            const response = await this.fetchWithAuth(`${this.API_BASE}/chat/conversations`);
            if (response.success) {
                this.conversations = response.conversations;
                this.renderConversations();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showToast('Failed to load conversations', 'error');
        }
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                    <button class="btn btn-primary" onclick="showNewChatModal()">
                        Start a Chat
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.conversations.map(conv => this.renderConversationItem(conv)).join('');
    }

    renderConversationItem(conversation) {
        const isActive = this.currentChat?._id === conversation._id;
        const unreadCount = conversation.unreadCount || 0;
        const lastMessage = conversation.lastMessage || { text: 'No messages yet', timestamp: conversation.createdAt };
        
        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" 
                 onclick="chatManager.openChat('${conversation._id}')"
                 data-conversation-id="${conversation._id}">
                <div class="conversation-avatar">
                    ${conversation.type === 'private' 
                        ? `<img src="${conversation.participant.avatar || '../images/default-avatar.jpg'}" 
                              alt="${conversation.participant.name}">`
                        : `<i class="fas fa-users"></i>`}
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h4>${conversation.type === 'private' 
                            ? conversation.participant.name 
                            : conversation.name}</h4>
                        <span class="conversation-time">${this.formatTimeAgo(lastMessage.timestamp)}</span>
                    </div>
                    <div class="conversation-preview">
                        <p>${this.sanitizeHtml(lastMessage.text)}</p>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async openChat(conversationId) {
        try {
            const response = await this.fetchWithAuth(`${this.API_BASE}/chat/conversations/${conversationId}`);
            if (response.success) {
                this.currentChat = response.conversation;
                this.showChatWindow();
                this.loadMessages();
            }
        } catch (error) {
            console.error('Error opening chat:', error);
            this.showToast('Failed to open chat', 'error');
        }
    }

    showChatWindow() {
        const welcome = document.getElementById('chatWelcome');
        const window = document.getElementById('chatWindow');
        const header = document.getElementById('chatHeader');
        
        if (welcome) welcome.classList.add('hidden');
        if (window) window.classList.remove('hidden');
        
        if (header && this.currentChat) {
            const title = header.querySelector('#chatTitle');
            const status = header.querySelector('#chatStatus');
            const avatar = header.querySelector('#chatAvatar');
            
            if (title) title.textContent = this.currentChat.type === 'private' 
                ? this.currentChat.participant.name 
                : this.currentChat.name;
            
            if (status) status.textContent = this.currentChat.type === 'private' 
                ? (this.currentChat.participant.online ? 'Online' : 'Offline')
                : `${this.currentChat.participants.length} members`;
            
            if (avatar && this.currentChat.type === 'private') {
                avatar.innerHTML = `<img src="${this.currentChat.participant.avatar || '../images/default-avatar.jpg'}" 
                                        alt="${this.currentChat.participant.name}">`;
            }
        }
    }

    async loadMessages() {
        try {
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/chat/conversations/${this.currentChat._id}/messages`
            );
            
            if (response.success) {
                this.renderMessages(response.messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showToast('Failed to load messages', 'error');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesList');
        if (!container) return;

        container.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
        this.scrollToBottom();
    }

    renderMessage(message) {
        const isOwn = message.sender._id === this.user._id;
        
        return `
            <div class="message ${isOwn ? 'own' : ''}" data-message-id="${message._id}">
                <div class="message-avatar">
                    <img src="${message.sender.avatar || '../images/default-avatar.jpg'}" 
                         alt="${message.sender.name}">
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${message.sender.name}</span>
                        <span class="message-time">${this.formatTimeAgo(message.timestamp)}</span>
                    </div>
                    <div class="message-text">
                        ${this.sanitizeHtml(message.text)}
                    </div>
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input || !input.value.trim() || !this.currentChat) return;

        try {
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/chat/conversations/${this.currentChat._id}/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: input.value.trim() })
                }
            );

            if (response.success) {
                input.value = '';
                this.appendMessage(response.message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    appendMessage(message) {
        const container = document.getElementById('messagesList');
        if (!container) return;

        const messageElement = document.createElement('div');
        messageElement.innerHTML = this.renderMessage(message);
        container.appendChild(messageElement.firstElementChild);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    setupWebSocket() {
        if (!window.io) {
            console.warn('Socket.IO not available');
            return;
        }

        this.socket = window.io();

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        this.socket.on('newMessage', (message) => {
            if (this.currentChat?._id === message.conversationId) {
                this.appendMessage(message);
            }
            this.updateConversationPreview(message);
        });

        this.socket.on('userStatus', (data) => {
            this.updateUserStatus(data);
        });
    }

    updateConversationPreview(message) {
        const conversation = this.conversations.find(c => c._id === message.conversationId);
        if (conversation) {
            conversation.lastMessage = message;
            this.renderConversations();
        }
    }

    updateUserStatus(data) {
        if (this.currentChat?.type === 'private' && 
            this.currentChat.participant._id === data.userId) {
            const status = document.getElementById('chatStatus');
            if (status) {
                status.textContent = data.online ? 'Online' : 'Offline';
            }
        }
    }

    async searchUsers(query) {
        if (!query || query.length < 2) return;

        try {
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/users/search?q=${encodeURIComponent(query)}`
            );
            
            if (response.success) {
                this.renderUserSearchResults(response.users);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    renderUserSearchResults(users) {
        const container = document.getElementById('searchUsersList');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-item" onclick="chatManager.startChat('${user._id}')">
                <img src="${user.avatar || '../images/default-avatar.jpg'}" 
                     alt="${user.name}" 
                     class="user-avatar">
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>${user.title || 'User'}</p>
                </div>
            </div>
        `).join('');
    }

    async startChat(userId) {
        try {
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/chat/conversations/start`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                }
            );

            if (response.success) {
                hideNewChatModal();
                await this.loadConversations();
                this.openChat(response.conversation._id);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            this.showToast('Failed to start chat', 'error');
        }
    }

    async createGroup() {
        const name = document.getElementById('groupName')?.value;
        const description = document.getElementById('groupDescription')?.value;
        const isPublic = document.getElementById('groupPublic')?.checked;
        const members = Array.from(document.querySelectorAll('.selected-member'))
            .map(el => el.dataset.userId);

        if (!name || members.length === 0) {
            this.showToast('Please provide group name and select members', 'warning');
            return;
        }

        try {
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/chat/groups`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        description,
                        isPublic,
                        members
                    })
                }
            );

            if (response.success) {
                hideCreateGroupModal();
                await this.loadConversations();
                this.openChat(response.group._id);
            }
        } catch (error) {
            console.error('Error creating group:', error);
            this.showToast('Failed to create group', 'error');
        }
    }

    switchChatTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        const conversations = this.conversations.filter(conv => {
            if (tab === 'all') return true;
            return conv.type === tab;
        });

        this.renderConversations(conversations);
    }

    handleSearch(query) {
        if (!query) {
            this.renderConversations();
            return;
        }

        const filtered = this.conversations.filter(conv => {
            const searchText = conv.type === 'private'
                ? conv.participant.name.toLowerCase()
                : conv.name.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        this.renderConversations(filtered);
    }

    async fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    formatTimeAgo(dateString) {
        if (!dateString) return '';
        
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    sanitizeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Global functions for onclick handlers
window.showNewChatModal = function() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.classList.add('active');
    }
};

window.hideNewChatModal = function() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.showCreateGroupModal = function() {
    const modal = document.getElementById('createGroupModal');
    if (modal) {
        modal.classList.add('active');
    }
};

window.hideCreateGroupModal = function() {
    const modal = document.getElementById('createGroupModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.toggleChatInfo = function() {
    const panel = document.getElementById('chatInfoPanel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
};

window.closeChatWindow = function() {
    const welcome = document.getElementById('chatWelcome');
    const window = document.getElementById('chatWindow');
    if (welcome) welcome.classList.remove('hidden');
    if (window) window.classList.add('hidden');
};

window.toggleAttachmentMenu = function() {
    const menu = document.getElementById('attachmentMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
};

window.toggleEmojiPicker = function() {
    // Implement emoji picker functionality
    console.log('Emoji picker not implemented yet');
};

window.selectImage = function() {
    const input = document.getElementById('imageInput');
    if (input) {
        input.click();
    }
};

window.selectFile = function() {
    // Implement file selection functionality
    console.log('File selection not implemented yet');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chatManager = new ChatManager();
});
