<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { message } from 'ant-design-vue';
import { useChat, type ChatMessage } from '@/composables/useChat';
import {
  SendOutlined,
  EnvironmentOutlined,
  CloseOutlined,
  WifiOutlined,
  LoadingOutlined,
  CarOutlined,
  ShopOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons-vue';

const props = defineProps<{
  deliveryId: string;
  orderId: string;
  userType: 'driver' | 'customer' | 'restaurant';
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  unreadChange: [count: number];
}>();

const {
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
} = useChat(props.deliveryId, props.orderId, props.userType);

const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const showQuickReplies = ref(false);

// Scroll to bottom when new messages arrive
watch(
  () => messages.value.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

// Mark as read when chat is opened
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      markAsRead();
    }
  },
  { immediate: true }
);

// Emit unread count changes
watch(
  () => unreadCount.value,
  (count) => {
    emit('unreadChange', count);
  }
);

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const handleSend = async () => {
  if (!messageInput.value.trim() || isSending.value) {
    return;
  }

  const content = messageInput.value.trim();
  messageInput.value = '';

  try {
    await sendMessage(content);
  } catch {
    // Restore message if failed
    messageInput.value = content;
  }
};

const handleQuickReply = async (reply: string) => {
  showQuickReplies.value = false;
  try {
    await sendMessage(reply, 'quick_reply');
  } catch {
    console.error('Failed to send quick reply');
  }
};

const handleInputChange = () => {
  if (messageInput.value.length > 0) {
    setTyping(true);
  }
};

const handleSendLocation = async () => {
  if (!navigator.geolocation) {
    message.warning('La géolocalisation n\'est pas disponible');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await sendLocation(position.coords.latitude, position.coords.longitude);
    },
    () => {
      message.warning('Impossible d\'obtenir votre position');
    }
  );
};

const getSenderIcon = (senderType: string) => {
  switch (senderType) {
    case 'driver': return CarOutlined;
    case 'restaurant': return ShopOutlined;
    case 'customer': return UserOutlined;
    case 'system': return RobotOutlined;
    default: return UserOutlined;
  }
};

const getSenderColor = (senderType: string) => {
  switch (senderType) {
    case 'driver': return '#1890ff';
    case 'restaurant': return '#faad14';
    case 'customer': return '#52c41a';
    case 'system': return '#8c8c8c';
    default: return '#1890ff';
  }
};

const formatTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const groupedMessages = computed(() => {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';

  messages.value.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msgDate, messages: [msg] });
    } else {
      groups[groups.length - 1]?.messages.push(msg);
    }
  });

  return groups;
});
</script>

<template>
  <div class="chat-box" :class="{ open: isOpen }">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left">
        <h3>Discussion livraison</h3>
        <span class="connection-status" :class="{ connected: isConnected }">
          <WifiOutlined />
          {{ isConnected ? 'En ligne' : 'Hors ligne' }}
        </span>
      </div>
      <button class="close-btn" @click="emit('close')">
        <CloseOutlined />
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="isLoading" class="loading-state">
        <a-spin />
        <span>Chargement...</span>
      </div>

      <template v-else>
        <div v-if="messages.length === 0" class="empty-state">
          <p>Aucun message pour le moment</p>
          <p class="hint">Envoyez un message pour démarrer la conversation</p>
        </div>

        <template v-for="group in groupedMessages" :key="group.date">
          <div class="date-separator">
            <span>{{ group.date }}</span>
          </div>

          <div
            v-for="msg in group.messages"
            :key="msg._id"
            :class="['message', { own: msg.isOwn, system: msg.sender.type === 'system' }]"
          >
            <!-- System message -->
            <template v-if="msg.sender.type === 'system'">
              <div class="system-message">
                <RobotOutlined />
                <span>{{ msg.content }}</span>
              </div>
            </template>

            <!-- Regular message -->
            <template v-else>
              <div class="message-avatar" v-if="!msg.isOwn">
                <component
                  :is="getSenderIcon(msg.sender.type)"
                  :style="{ color: getSenderColor(msg.sender.type) }"
                />
              </div>

              <div class="message-content">
                <span class="sender-name" v-if="!msg.isOwn">{{ msg.sender.name }}</span>

                <!-- Location message -->
                <div v-if="msg.messageType === 'location' && msg.location" class="location-message">
                  <EnvironmentOutlined />
                  <span>{{ msg.content }}</span>
                  <a
                    :href="`https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`"
                    target="_blank"
                    class="view-map"
                  >
                    Voir sur la carte
                  </a>
                </div>

                <!-- Text message -->
                <div v-else class="text-content">
                  {{ msg.content }}
                </div>

                <span class="message-time">
                  {{ formatTime(msg.createdAt) }}
                  <span v-if="msg.isOwn && msg.isRead" class="read-indicator">✓✓</span>
                </span>
              </div>
            </template>
          </div>
        </template>
      </template>

      <!-- Typing indicator -->
      <div v-if="typingText" class="typing-indicator">
        <span class="dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
        {{ typingText }}
      </div>
    </div>

    <!-- Quick replies -->
    <div v-if="showQuickReplies" class="quick-replies">
      <button
        v-for="reply in quickReplies"
        :key="reply"
        class="quick-reply-btn"
        @click="handleQuickReply(reply)"
      >
        {{ reply }}
      </button>
    </div>

    <!-- Input -->
    <div class="chat-input">
      <button
        class="action-btn"
        @click="showQuickReplies = !showQuickReplies"
        title="Réponses rapides"
      >
        💬
      </button>

      <button
        class="action-btn"
        @click="handleSendLocation"
        title="Envoyer ma position"
      >
        <EnvironmentOutlined />
      </button>

      <input
        v-model="messageInput"
        type="text"
        placeholder="Écrivez un message..."
        @keyup.enter="handleSend"
        @input="handleInputChange"
        :disabled="!isConnected"
      />

      <button
        class="send-btn"
        @click="handleSend"
        :disabled="!messageInput.trim() || isSending || !isConnected"
      >
        <LoadingOutlined v-if="isSending" />
        <SendOutlined v-else />
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 500px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  opacity: 0.7;
}

.connection-status.connected {
  opacity: 1;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f7fa;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #8c8c8c;
  gap: 8px;
}

.empty-state .hint {
  font-size: 12px;
}

.date-separator {
  text-align: center;
  margin: 16px 0;
}

.date-separator span {
  background: #e8e8e8;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  color: #8c8c8c;
  text-transform: capitalize;
}

.message {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  max-width: 85%;
}

.message.own {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message.system {
  max-width: 100%;
  justify-content: center;
}

.system-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f0f0;
  border-radius: 16px;
  font-size: 12px;
  color: #8c8c8c;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-content {
  background: #fff;
  padding: 10px 14px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message.own .message-content {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
}

.sender-name {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 4px;
}

.text-content {
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.location-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.view-map {
  font-size: 12px;
  color: inherit;
  text-decoration: underline;
}

.message.own .view-map {
  color: rgba(255, 255, 255, 0.9);
}

.message-time {
  display: block;
  font-size: 10px;
  color: #8c8c8c;
  margin-top: 4px;
  text-align: right;
}

.message.own .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.read-indicator {
  color: #52c41a;
}

.message.own .read-indicator {
  color: rgba(255, 255, 255, 0.9);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 16px;
  font-size: 12px;
  color: #8c8c8c;
  width: fit-content;
}

.typing-indicator .dots {
  display: flex;
  gap: 3px;
}

.typing-indicator .dots span {
  width: 6px;
  height: 6px;
  background: #8c8c8c;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator .dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.quick-reply-btn {
  background: #f5f7fa;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-reply-btn:hover {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  cursor: pointer;
  font-size: 18px;
  border-radius: 50%;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #f5f7fa;
  color: #1890ff;
}

.chat-input input {
  flex: 1;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  padding: 10px 16px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input input:focus {
  border-color: #1890ff;
}

.chat-input input:disabled {
  background: #f5f5f5;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
