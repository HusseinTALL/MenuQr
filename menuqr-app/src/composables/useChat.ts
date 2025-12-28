/**
 * Chat Composable
 * Provides real-time chat functionality for delivery communications
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import api from '@/services/api';

// Types
export interface ChatMessage {
  _id: string;
  sender: {
    type: 'driver' | 'customer' | 'restaurant' | 'system';
    name: string;
  };
  recipient: {
    type: 'driver' | 'customer' | 'restaurant' | 'all';
  };
  messageType: 'text' | 'image' | 'location' | 'quick_reply' | 'system';
  content: string;
  imageUrl?: string;
  location?: { lat: number; lng: number };
  quickReplyOptions?: string[];
  createdAt: Date;
  isOwn?: boolean;
  isRead?: boolean;
}

export interface TypingIndicator {
  userId: string;
  userType: string;
  isTyping: boolean;
}

// Singleton socket instance for chat
let chatSocket: Socket | null = null;

/**
 * Main chat composable
 */
export function useChat(deliveryId: string, orderId: string, userType: 'driver' | 'customer' | 'restaurant') {
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);
  const isSending = ref(false);
  const isConnected = ref(false);
  const typingUsers = ref<Map<string, TypingIndicator>>(new Map());
  const unreadCount = ref(0);
  const quickReplies = ref<string[]>([]);

  // Get auth token based on user type
  const getToken = (): string | null => {
    if (userType === 'driver') {
      return localStorage.getItem('driver_token');
    } else if (userType === 'restaurant') {
      return localStorage.getItem('token');
    } else {
      return localStorage.getItem('customer_token');
    }
  };

  // Connect to chat socket
  const connect = () => {
    const token = getToken();
    if (!token) {
      console.warn('[Chat] No token available');
      return;
    }

    if (chatSocket?.connected) {
      // Already connected, just join the chat room
      chatSocket.emit('join:chat', deliveryId);
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

    chatSocket = io(apiUrl, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    chatSocket.on('connect', () => {
      isConnected.value = true;
      chatSocket?.emit('join:chat', deliveryId);
      console.info('[Chat] Connected and joined room');
    });

    chatSocket.on('disconnect', () => {
      isConnected.value = false;
      console.info('[Chat] Disconnected');
    });

    // Listen for new messages
    chatSocket.on('chat:message', (message: ChatMessage) => {
      // Add isOwn flag
      message.isOwn = message.sender.type === userType;
      messages.value.push(message);

      // Update unread count if not own message
      if (!message.isOwn) {
        unreadCount.value++;
      }
    });

    // Listen for typing indicators
    chatSocket.on('chat:typing', (data: TypingIndicator) => {
      if (data.isTyping) {
        typingUsers.value.set(data.userId, data);
      } else {
        typingUsers.value.delete(data.userId);
      }
    });

    // Listen for message read acknowledgments
    chatSocket.on('chat:messages:read', (data: { readBy: string }) => {
      if (data.readBy !== userType) {
        // Mark messages as read
        messages.value.forEach(msg => {
          if (msg.sender.type === userType) {
            msg.isRead = true;
          }
        });
      }
    });

    // Listen for message deletions
    chatSocket.on('chat:message:deleted', (data: { messageId: string }) => {
      const index = messages.value.findIndex(m => m._id === data.messageId);
      if (index !== -1) {
        messages.value[index].content = 'Ce message a été supprimé';
      }
    });

    // Error handling
    chatSocket.on('chat:error', (error: { message: string }) => {
      console.error('[Chat] Error:', error.message);
    });
  };

  // Disconnect from chat
  const disconnect = () => {
    if (chatSocket) {
      chatSocket.emit('leave:chat', deliveryId);
      chatSocket.disconnect();
      chatSocket = null;
      isConnected.value = false;
    }
  };

  // Load chat history
  const loadHistory = async () => {
    isLoading.value = true;
    try {
      const response = await api.get<{ messages: ChatMessage[] }>(`/chat/delivery/${deliveryId}/messages`);
      if (response.success && response.data) {
        messages.value = response.data.messages.map(msg => ({
          ...msg,
          isOwn: msg.sender.type === userType,
        }));
      }
    } catch (error) {
      console.error('[Chat] Failed to load history:', error);
    } finally {
      isLoading.value = false;
    }
  };

  // Load quick replies
  const loadQuickReplies = async () => {
    try {
      const response = await api.get<{ quickReplies: string[] }>('/chat/quick-replies');
      if (response.success && response.data) {
        quickReplies.value = response.data.quickReplies;
      }
    } catch (error) {
      console.error('[Chat] Failed to load quick replies:', error);
    }
  };

  // Send a message
  const sendMessage = async (content: string, messageType: 'text' | 'quick_reply' = 'text') => {
    if (!content.trim()) {
      return;
    }

    isSending.value = true;
    try {
      // Send via socket for real-time
      if (chatSocket?.connected) {
        chatSocket.emit('chat:send', {
          deliveryId,
          orderId,
          recipientType: 'all', // Group chat - send to all
          content: content.trim(),
          messageType,
        });
      }

      // Also send via API for persistence
      await api.post(`/chat/delivery/${deliveryId}/messages`, {
        content: content.trim(),
        recipientType: 'all',
        messageType,
      });

      // Stop typing indicator
      setTyping(false);
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      throw error;
    } finally {
      isSending.value = false;
    }
  };

  // Send location
  const sendLocation = async (lat: number, lng: number) => {
    try {
      await api.post(`/chat/delivery/${deliveryId}/messages`, {
        content: 'Ma position actuelle',
        recipientType: 'all',
        messageType: 'location',
        location: { lat, lng },
      });
    } catch (error) {
      console.error('[Chat] Failed to send location:', error);
    }
  };

  // Set typing indicator
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  const setTyping = (isTyping: boolean) => {
    if (chatSocket?.connected) {
      chatSocket.emit('chat:typing', { deliveryId, isTyping });
    }

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      typingTimeout = setTimeout(() => setTyping(false), 3000);
    }
  };

  // Mark messages as read
  const markAsRead = async () => {
    if (unreadCount.value === 0) {
      return;
    }

    try {
      await api.post(`/chat/delivery/${deliveryId}/read`);
      unreadCount.value = 0;

      // Notify via socket
      if (chatSocket?.connected) {
        chatSocket.emit('chat:read', { deliveryId });
      }
    } catch (error) {
      console.error('[Chat] Failed to mark as read:', error);
    }
  };

  // Computed: who is typing
  const typingText = computed(() => {
    const typing = Array.from(typingUsers.value.values());
    if (typing.length === 0) {
      return '';
    }
    if (typing.length === 1) {
      const typeLabels: Record<string, string> = {
        driver: 'Le livreur',
        customer: 'Le client',
        restaurant: 'Le restaurant',
      };
      return `${typeLabels[typing[0].userType] || 'Quelqu\'un'} écrit...`;
    }
    return 'Plusieurs personnes écrivent...';
  });

  // Initialize
  onMounted(() => {
    connect();
    loadHistory();
    loadQuickReplies();
  });

  // Cleanup
  onUnmounted(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    disconnect();
  });

  return {
    messages,
    isLoading,
    isSending,
    isConnected,
    unreadCount,
    quickReplies,
    typingText,
    sendMessage,
    sendLocation,
    setTyping,
    markAsRead,
    loadHistory,
    connect,
    disconnect,
  };
}

export default useChat;
