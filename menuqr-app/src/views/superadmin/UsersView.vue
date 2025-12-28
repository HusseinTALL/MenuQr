<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import api from '@/services/api';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  EyeOutlined,
  UserOutlined,
  MailOutlined,
  ShopOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { Modal, message } from 'ant-design-vue';

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  restaurantId?: Restaurant;
  lastLoginAt?: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  restaurantId: string | null;
  isActive: boolean;
}

const loading = ref(true);
const users = ref<User[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});
const search = ref('');
const roleFilter = ref<string>('all');
const statusFilter = ref<string>('all');

// Drawer state
const drawerVisible = ref(false);
const selectedUser = ref<User | null>(null);

// Modal state
const modalVisible = ref(false);
const modalLoading = ref(false);
const isEditing = ref(false);
const editingUserId = ref<string | null>(null);

// Password reset modal
const passwordModalVisible = ref(false);
const passwordModalLoading = ref(false);
const passwordResetUser = ref<User | null>(null);
const newPassword = ref('');
const confirmPassword = ref('');

// Restaurants for dropdown
const restaurants = ref<Restaurant[]>([]);

// Form state
const userForm = ref<UserForm>({
  name: '',
  email: '',
  password: '',
  role: 'staff',
  restaurantId: null,
  isActive: true,
});

const columns: TableColumnsType = [
  {
    title: 'Utilisateur',
    key: 'user',
    fixed: 'left',
    width: 280,
  },
  {
    title: 'Role',
    key: 'role',
    width: 120,
    align: 'center',
  },
  {
    title: 'Restaurant',
    key: 'restaurant',
    width: 200,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Date creation',
    key: 'createdAt',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 180,
    align: 'center',
  },
];

const roleColors: Record<string, string> = {
  superadmin: 'purple',
  owner: 'blue',
  admin: 'cyan',
  staff: 'default',
};

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  owner: 'Proprietaire',
  admin: 'Admin',
  staff: 'Staff',
};

const requiresRestaurant = computed(() => {
  return ['owner', 'admin', 'staff'].includes(userForm.value.role);
});

const modalTitle = computed(() => {
  return isEditing.value ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur';
});

const passwordsMatch = computed(() => {
  return newPassword.value === confirmPassword.value;
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await api.get<{
      users: User[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>('/superadmin/users', {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: search.value || undefined,
      role: roleFilter.value !== 'all' ? roleFilter.value : undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    });

    if (response.success && response.data) {
      users.value = response.data.users;
      pagination.value.total = response.data.pagination.total;
    }
  } catch {
    console.error('Failed to fetch users:', error);
    message.error('Erreur lors du chargement des utilisateurs');
  } finally {
    loading.value = false;
  }
};

const fetchRestaurants = async () => {
  try {
    const response = await api.get<{
      restaurants: Restaurant[];
    }>('/superadmin/restaurants', {
      limit: 100,
    });

    if (response.success && response.data) {
      restaurants.value = response.data.restaurants;
    }
  } catch {
    console.error('Failed to fetch restaurants:', error);
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchUsers();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchUsers();
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const formatDateTime = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Drawer functions
const openDrawer = (user: User) => {
  selectedUser.value = user;
  drawerVisible.value = true;
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedUser.value = null;
};

// Modal functions
const openCreateModal = () => {
  isEditing.value = false;
  editingUserId.value = null;
  userForm.value = {
    name: '',
    email: '',
    password: '',
    role: 'staff',
    restaurantId: null,
    isActive: true,
  };
  modalVisible.value = true;
};

const openEditModal = (user: User) => {
  isEditing.value = true;
  editingUserId.value = user._id;
  userForm.value = {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    restaurantId: user.restaurantId?._id || null,
    isActive: user.isActive,
  };
  modalVisible.value = true;
};

const closeModal = () => {
  modalVisible.value = false;
  isEditing.value = false;
  editingUserId.value = null;
};

const handleSubmit = async () => {
  if (!userForm.value.name || !userForm.value.email) {
    message.error('Veuillez remplir tous les champs obligatoires');
    return;
  }

  if (!isEditing.value && !userForm.value.password) {
    message.error('Le mot de passe est obligatoire pour un nouvel utilisateur');
    return;
  }

  if (requiresRestaurant.value && !userForm.value.restaurantId) {
    message.error('Veuillez selectionner un restaurant');
    return;
  }

  modalLoading.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: userForm.value.name,
      email: userForm.value.email,
      role: userForm.value.role,
      isActive: userForm.value.isActive,
    };

    if (userForm.value.password) {
      payload.password = userForm.value.password;
    }

    if (requiresRestaurant.value) {
      payload.restaurantId = userForm.value.restaurantId;
    }

    let response;
    if (isEditing.value && editingUserId.value) {
      response = await api.put(`/superadmin/users/${editingUserId.value}`, payload);
    } else {
      response = await api.post('/superadmin/users', payload);
    }

    if (response.success) {
      message.success(isEditing.value ? 'Utilisateur modifie avec succes' : 'Utilisateur cree avec succes');
      closeModal();
      fetchUsers();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch {
    console.error('Failed to save user:', error);
    message.error('Erreur lors de l\'enregistrement');
  } finally {
    modalLoading.value = false;
  }
};

// Password reset functions
const openPasswordModal = (user: User) => {
  passwordResetUser.value = user;
  newPassword.value = '';
  confirmPassword.value = '';
  passwordModalVisible.value = true;
};

const closePasswordModal = () => {
  passwordModalVisible.value = false;
  passwordResetUser.value = null;
  newPassword.value = '';
  confirmPassword.value = '';
};

const handlePasswordReset = async () => {
  if (!newPassword.value || newPassword.value.length < 8) {
    message.error('Le mot de passe doit contenir au moins 8 caracteres');
    return;
  }

  if (!passwordsMatch.value) {
    message.error('Les mots de passe ne correspondent pas');
    return;
  }

  if (!passwordResetUser.value) {return;}

  passwordModalLoading.value = true;
  try {
    const response = await api.put(`/superadmin/users/${passwordResetUser.value._id}/reset-password`, {
      password: newPassword.value,
    });

    if (response.success) {
      message.success('Mot de passe reinitialise avec succes');
      closePasswordModal();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch {
    console.error('Failed to reset password:', error);
    message.error('Erreur lors de la reinitialisation');
  } finally {
    passwordModalLoading.value = false;
  }
};

// Toggle user status
const toggleUserStatus = (user: User) => {
  const newStatus = !user.isActive;
  const action = newStatus ? 'activer' : 'desactiver';

  Modal.confirm({
    title: `${newStatus ? 'Activer' : 'Desactiver'} l'utilisateur ?`,
    icon: h(ExclamationCircleOutlined),
    content: h('div', {}, [
      h('p', {}, `Voulez-vous vraiment ${action} cet utilisateur ?`),
      h('p', { style: 'font-weight: 600; margin-top: 8px;' }, user.name),
      h('p', { style: 'color: #666;' }, user.email),
    ]),
    okText: newStatus ? 'Activer' : 'Desactiver',
    okType: newStatus ? 'primary' : 'default',
    cancelText: 'Annuler',
    async onOk() {
      try {
        const response = await api.put(`/superadmin/users/${user._id}`, {
          isActive: newStatus,
        });

        if (response.success) {
          message.success(`Utilisateur ${newStatus ? 'active' : 'desactive'} avec succes`);
          fetchUsers();
        } else {
          message.error(response.message || 'Une erreur est survenue');
        }
      } catch {
        console.error('Failed to toggle status:', error);
        message.error('Erreur lors de la modification du statut');
      }
    },
  });
};

// Delete user
const deleteUser = (user: User) => {
  if (user.role === 'superadmin') {
    message.warning('Impossible de supprimer un Super Admin');
    return;
  }

  Modal.confirm({
    title: 'Supprimer l\'utilisateur ?',
    icon: h(ExclamationCircleOutlined),
    content: h('div', {}, [
      h('p', {}, 'Cette action est irreversible. L\'utilisateur sera definitivement supprime.'),
      h('p', { style: 'font-weight: 600; margin-top: 8px;' }, user.name),
      h('p', { style: 'color: #666;' }, user.email),
    ]),
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        const response = await api.delete(`/superadmin/users/${user._id}`);

        if (response.success) {
          message.success('Utilisateur supprime avec succes');
          fetchUsers();
          if (selectedUser.value?._id === user._id) {
            closeDrawer();
          }
        } else {
          message.error(response.message || 'Une erreur est survenue');
        }
      } catch {
        console.error('Failed to delete user:', error);
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

onMounted(() => {
  fetchUsers();
  fetchRestaurants();
});
</script>

<template>
  <div class="users-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Utilisateurs</h1>
        <p class="page-subtitle">Gerez tous les utilisateurs de la plateforme</p>
      </div>
      <a-space>
        <a-button @click="fetchUsers">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Nouvel utilisateur
        </a-button>
      </a-space>
    </div>

    <!-- Filters -->
    <a-card class="filters-card mb-4">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="8">
          <a-input-search
            v-model:value="search"
            placeholder="Rechercher un utilisateur..."
            allow-clear
            @search="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input-search>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="roleFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous les roles</a-select-option>
            <a-select-option value="superadmin">Super Admin</a-select-option>
            <a-select-option value="owner">Owner</a-select-option>
            <a-select-option value="admin">Admin</a-select-option>
            <a-select-option value="staff">Staff</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="statusFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous statuts</a-select-option>
            <a-select-option value="active">Actifs</a-select-option>
            <a-select-option value="inactive">Inactifs</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} utilisateurs`,
        }"
        :scroll="{ x: 1100 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <div class="user-cell" @click="openDrawer(record)" style="cursor: pointer;">
              <a-avatar :style="{ backgroundColor: roleColors[record.role] === 'purple' ? '#8b5cf6' : '#1890ff' }">
                {{ record.name?.charAt(0)?.toUpperCase() }}
              </a-avatar>
              <div class="user-info">
                <span class="user-name">{{ record.name }}</span>
                <span class="user-email">{{ record.email }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'role'">
            <a-tag :color="roleColors[record.role] || 'default'">
              {{ roleLabels[record.role] || record.role }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'restaurant'">
            <template v-if="record.restaurantId">
              <a-tooltip :title="`/menu/${record.restaurantId.slug}`">
                <span class="restaurant-link">{{ record.restaurantId.name }}</span>
              </a-tooltip>
            </template>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.isActive ? 'green' : 'red'">
              {{ record.isActive ? 'Actif' : 'Inactif' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Voir details">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Modifier">
                <a-button type="text" size="small" @click="openEditModal(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Reinitialiser mot de passe">
                <a-button type="text" size="small" @click="openPasswordModal(record)">
                  <template #icon><KeyOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip :title="record.isActive ? 'Desactiver' : 'Activer'">
                <a-button
                  type="text"
                  size="small"
                  :class="record.isActive ? '' : 'text-green'"
                  @click="toggleUserStatus(record)"
                >
                  <template #icon>
                    <StopOutlined v-if="record.isActive" />
                    <CheckCircleOutlined v-else />
                  </template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Supprimer">
                <a-button
                  type="text"
                  size="small"
                  danger
                  :disabled="record.role === 'superadmin'"
                  @click="deleteUser(record)"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- User Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details de l'utilisateur"
      placement="right"
      :width="480"
      @close="closeDrawer"
    >
      <template v-if="selectedUser">
        <div class="drawer-content">
          <!-- User Header -->
          <div class="user-header">
            <a-avatar
              :size="80"
              :style="{ backgroundColor: roleColors[selectedUser.role] === 'purple' ? '#8b5cf6' : '#1890ff' }"
            >
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <div class="user-header-info">
              <h2>{{ selectedUser.name }}</h2>
              <a-tag :color="roleColors[selectedUser.role] || 'default'" class="role-tag">
                {{ roleLabels[selectedUser.role] || selectedUser.role }}
              </a-tag>
              <a-tag :color="selectedUser.isActive ? 'green' : 'red'">
                {{ selectedUser.isActive ? 'Actif' : 'Inactif' }}
              </a-tag>
            </div>
          </div>

          <a-divider />

          <!-- User Details -->
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item>
              <template #label>
                <MailOutlined /> Email
              </template>
              {{ selectedUser.email }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedUser.restaurantId">
              <template #label>
                <ShopOutlined /> Restaurant
              </template>
              {{ selectedUser.restaurantId.name }}
            </a-descriptions-item>
            <a-descriptions-item>
              <template #label>
                <CalendarOutlined /> Date de creation
              </template>
              {{ formatDateTime(selectedUser.createdAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedUser.updatedAt">
              <template #label>
                <CalendarOutlined /> Derniere modification
              </template>
              {{ formatDateTime(selectedUser.updatedAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedUser.lastLoginAt">
              <template #label>
                <UserOutlined /> Derniere connexion
              </template>
              {{ formatDateTime(selectedUser.lastLoginAt) }}
            </a-descriptions-item>
          </a-descriptions>

          <a-divider />

          <!-- Actions -->
          <div class="drawer-actions">
            <a-button block @click="openEditModal(selectedUser)">
              <template #icon><EditOutlined /></template>
              Modifier
            </a-button>
            <a-button block @click="openPasswordModal(selectedUser)">
              <template #icon><KeyOutlined /></template>
              Reinitialiser le mot de passe
            </a-button>
            <a-button
              block
              :type="selectedUser.isActive ? 'default' : 'primary'"
              @click="toggleUserStatus(selectedUser)"
            >
              <template #icon>
                <StopOutlined v-if="selectedUser.isActive" />
                <CheckCircleOutlined v-else />
              </template>
              {{ selectedUser.isActive ? 'Desactiver' : 'Activer' }}
            </a-button>
            <a-button
              block
              danger
              :disabled="selectedUser.role === 'superadmin'"
              @click="deleteUser(selectedUser)"
            >
              <template #icon><DeleteOutlined /></template>
              Supprimer
            </a-button>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- Create/Edit User Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="modalLoading"
      ok-text="Enregistrer"
      cancel-text="Annuler"
      @ok="handleSubmit"
      @cancel="closeModal"
    >
      <a-form layout="vertical" class="user-form">
        <a-form-item label="Nom complet" required>
          <a-input
            v-model:value="userForm.name"
            placeholder="Nom de l'utilisateur"
          >
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item label="Email" required>
          <a-input
            v-model:value="userForm.email"
            type="email"
            placeholder="email@example.com"
          >
            <template #prefix><MailOutlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item :label="isEditing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'" :required="!isEditing">
          <a-input-password
            v-model:value="userForm.password"
            :placeholder="isEditing ? 'Laisser vide pour ne pas changer' : 'Mot de passe'"
          >
            <template #prefix><KeyOutlined /></template>
          </a-input-password>
        </a-form-item>

        <a-form-item label="Role" required>
          <a-select v-model:value="userForm.role" placeholder="Selectionner un role">
            <a-select-option value="staff">Staff</a-select-option>
            <a-select-option value="admin">Admin</a-select-option>
            <a-select-option value="owner">Proprietaire</a-select-option>
            <a-select-option value="superadmin">Super Admin</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item v-if="requiresRestaurant" label="Restaurant" required>
          <a-select
            v-model:value="userForm.restaurantId"
            placeholder="Selectionner un restaurant"
            show-search
            :filter-option="(input: string, option: { label?: string }) =>
              option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false"
          >
            <a-select-option
              v-for="restaurant in restaurants"
              :key="restaurant._id"
              :value="restaurant._id"
              :label="restaurant.name"
            >
              {{ restaurant.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Statut">
          <a-switch v-model:checked="userForm.isActive" />
          <span class="status-label">{{ userForm.isActive ? 'Actif' : 'Inactif' }}</span>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Password Reset Modal -->
    <a-modal
      v-model:open="passwordModalVisible"
      title="Reinitialiser le mot de passe"
      :confirm-loading="passwordModalLoading"
      ok-text="Reinitialiser"
      cancel-text="Annuler"
      @ok="handlePasswordReset"
      @cancel="closePasswordModal"
    >
      <template v-if="passwordResetUser">
        <a-alert
          type="info"
          show-icon
          class="mb-4"
        >
          <template #message>
            Reinitialisation pour: <strong>{{ passwordResetUser.name }}</strong>
          </template>
          <template #description>
            {{ passwordResetUser.email }}
          </template>
        </a-alert>

        <a-form layout="vertical">
          <a-form-item label="Nouveau mot de passe" required>
            <a-input-password
              v-model:value="newPassword"
              placeholder="Minimum 8 caracteres"
            >
              <template #prefix><KeyOutlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item
            label="Confirmer le mot de passe"
            required
            :validate-status="confirmPassword && !passwordsMatch ? 'error' : ''"
            :help="confirmPassword && !passwordsMatch ? 'Les mots de passe ne correspondent pas' : ''"
          >
            <a-input-password
              v-model:value="confirmPassword"
              placeholder="Retapez le mot de passe"
            >
              <template #prefix><KeyOutlined /></template>
            </a-input-password>
          </a-form-item>
        </a-form>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.users-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.filters-card {
  border-radius: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-cell:hover .user-name {
  color: #1890ff;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: #1e293b;
  transition: color 0.2s;
}

.user-email {
  font-size: 12px;
  color: #64748b;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-green {
  color: #10b981;
}

.restaurant-link {
  color: #1890ff;
  cursor: help;
}

/* Drawer styles */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.role-tag {
  width: fit-content;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Form styles */
.user-form {
  margin-top: 16px;
}

.status-label {
  margin-left: 12px;
  color: #64748b;
}
</style>
