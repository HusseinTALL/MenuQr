<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  FormItem,
  Switch,
  Space,
  Card,
  Tooltip,
  Popconfirm,
  message,
  Alert,
} from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  KeyOutlined,
  UserOutlined,
  CopyOutlined,
} from '@ant-design/icons-vue';
import api, { type StaffMember, type CreateStaffData, type UpdateStaffData } from '@/services/api';

// State
const loading = ref(false);
const staff = ref<StaffMember[]>([]);
const searchQuery = ref('');
const selectedRole = ref<string | undefined>(undefined);
const selectedStatus = ref<string | undefined>(undefined);

// Roles
const availableRoles = ref<{ value: string; label: string; permissions: string[] }[]>([]);

// Modal state
const modalVisible = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalLoading = ref(false);
const selectedStaff = ref<StaffMember | null>(null);

// Password modal
const passwordModalVisible = ref(false);
const tempPassword = ref('');

// Form
const formData = ref<CreateStaffData>({
  email: '',
  name: '',
  role: 'staff',
  customPermissions: [],
});

// Role options for filter
const roleFilterOptions = computed(() => [
  { label: 'Tous les rôles', value: undefined },
  ...availableRoles.value.map((r) => ({ label: r.label, value: r.value })),
]);

// Status options for filter
const statusOptions = [
  { label: 'Tous les statuts', value: undefined },
  { label: 'Actif', value: 'true' },
  { label: 'Inactif', value: 'false' },
];

// Role color mapping
const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    admin: 'purple',
    manager: 'blue',
    kitchen: 'orange',
    cashier: 'green',
    staff: 'default',
    owner: 'gold',
  };
  return colors[role] || 'default';
};

// Table columns
const columns: ColumnsType<StaffMember> = [
  {
    title: 'Nom',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Rôle',
    dataIndex: 'role',
    key: 'role',
    customRender: ({ record }) => (
      <Tag color={getRoleColor(record.role)}>{record.roleDisplayName}</Tag>
    ),
  },
  {
    title: 'Statut',
    dataIndex: 'isActive',
    key: 'isActive',
    customRender: ({ record }) => (
      <Tag color={record.isActive ? 'success' : 'error'}>
        {record.isActive ? 'Actif' : 'Inactif'}
      </Tag>
    ),
  },
  {
    title: '2FA',
    dataIndex: 'twoFactorEnabled',
    key: 'twoFactorEnabled',
    customRender: ({ record }) => (
      <Tag color={record.twoFactorEnabled ? 'blue' : 'default'}>
        {record.twoFactorEnabled ? 'Activé' : 'Désactivé'}
      </Tag>
    ),
  },
  {
    title: 'Dernière connexion',
    dataIndex: 'lastLogin',
    key: 'lastLogin',
    customRender: ({ record }) =>
      record.lastLogin ? new Date(record.lastLogin).toLocaleString('fr-FR') : 'Jamais',
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 150,
  },
];

// Fetch staff
const fetchStaff = async () => {
  loading.value = true;
  try {
    const response = await api.getStaff({
      role: selectedRole.value,
      isActive: selectedStatus.value,
      search: searchQuery.value || undefined,
    });
    if (response.success && response.data) {
      staff.value = response.data.staff;
    }
  } catch (err) {
    message.error('Erreur lors du chargement du personnel');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// Fetch available roles
const fetchRoles = async () => {
  try {
    const response = await api.getAvailableRoles();
    if (response.success && response.data) {
      availableRoles.value = response.data.roles;
    }
  } catch (err) {
    console.error('Failed to fetch roles:', err);
  }
};

// Open create modal
const openCreateModal = () => {
  modalMode.value = 'create';
  formData.value = {
    email: '',
    name: '',
    role: 'staff',
    customPermissions: [],
  };
  selectedStaff.value = null;
  modalVisible.value = true;
};

// Open edit modal
const openEditModal = (member: StaffMember) => {
  modalMode.value = 'edit';
  selectedStaff.value = member;
  formData.value = {
    email: member.email,
    name: member.name,
    role: member.role,
    customPermissions: member.customPermissions || [],
  };
  modalVisible.value = true;
};

// Save staff
const handleSave = async () => {
  modalLoading.value = true;
  try {
    if (modalMode.value === 'create') {
      const response = await api.createStaffMember(formData.value);
      if (response.success && response.data) {
        message.success('Membre du personnel créé avec succès');
        tempPassword.value = response.data.temporaryPassword;
        passwordModalVisible.value = true;
        modalVisible.value = false;
        fetchStaff();
      } else {
        message.error(response.message || 'Erreur lors de la création');
      }
    } else if (selectedStaff.value) {
      const updateData: UpdateStaffData = {
        name: formData.value.name,
        role: formData.value.role,
        customPermissions: formData.value.customPermissions,
      };
      const response = await api.updateStaffMember(selectedStaff.value.id, updateData);
      if (response.success) {
        message.success('Membre du personnel mis à jour');
        modalVisible.value = false;
        fetchStaff();
      } else {
        message.error(response.message || 'Erreur lors de la mise à jour');
      }
    }
  } catch (err) {
    message.error('Erreur lors de la sauvegarde');
    console.error(err);
  } finally {
    modalLoading.value = false;
  }
};

// Toggle active status
const toggleActive = async (member: StaffMember) => {
  try {
    const response = await api.updateStaffMember(member.id, { isActive: !member.isActive });
    if (response.success) {
      message.success(`Membre ${member.isActive ? 'désactivé' : 'activé'} avec succès`);
      fetchStaff();
    }
  } catch (err) {
    message.error('Erreur lors de la mise à jour');
    console.error(err);
  }
};

// Delete staff
const handleDelete = async (id: string) => {
  try {
    const response = await api.deleteStaffMember(id);
    if (response.success) {
      message.success('Membre du personnel supprimé');
      fetchStaff();
    }
  } catch (err) {
    message.error('Erreur lors de la suppression');
    console.error(err);
  }
};

// Reset password
const handleResetPassword = async (id: string) => {
  try {
    const response = await api.resetStaffPassword(id);
    if (response.success && response.data) {
      tempPassword.value = response.data.temporaryPassword;
      passwordModalVisible.value = true;
    }
  } catch (err) {
    message.error('Erreur lors de la réinitialisation');
    console.error(err);
  }
};

// Copy password to clipboard
const copyPassword = () => {
  navigator.clipboard.writeText(tempPassword.value);
  message.success('Mot de passe copié');
};

onMounted(() => {
  fetchRoles();
  fetchStaff();
});
</script>

<template>
  <div class="staff-view">
    <!-- Header -->
    <div class="page-header">
      <h1>
        <UserOutlined />
        Gestion du personnel
      </h1>
      <Button type="primary" @click="openCreateModal">
        <PlusOutlined />
        Ajouter un membre
      </Button>
    </div>

    <!-- Filters -->
    <Card class="filters-card">
      <Space size="middle" wrap>
        <Input
          v-model:value="searchQuery"
          placeholder="Rechercher..."
          style="width: 250px"
          @pressEnter="fetchStaff"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </Input>
        <Select
          v-model:value="selectedRole"
          :options="roleFilterOptions"
          style="width: 180px"
          placeholder="Filtrer par rôle"
          @change="fetchStaff"
        />
        <Select
          v-model:value="selectedStatus"
          :options="statusOptions"
          style="width: 150px"
          placeholder="Statut"
          @change="fetchStaff"
        />
        <Button @click="fetchStaff">
          <ReloadOutlined />
          Actualiser
        </Button>
      </Space>
    </Card>

    <!-- Table -->
    <Card>
      <Table
        :columns="columns"
        :data-source="staff"
        :loading="loading"
        :row-key="(record: StaffMember) => record.id"
        :scroll="{ x: 1000 }"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <Tag :color="getRoleColor(record.role)">
              {{ record.roleDisplayName }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'isActive'">
            <Tag :color="record.isActive ? 'success' : 'error'">
              {{ record.isActive ? 'Actif' : 'Inactif' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'twoFactorEnabled'">
            <Tag :color="record.twoFactorEnabled ? 'blue' : 'default'">
              {{ record.twoFactorEnabled ? 'Activé' : 'Désactivé' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'lastLogin'">
            {{ record.lastLogin ? new Date(record.lastLogin).toLocaleString('fr-FR') : 'Jamais' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <Space>
              <Tooltip title="Modifier">
                <Button type="text" size="small" @click="openEditModal(record)">
                  <EditOutlined />
                </Button>
              </Tooltip>
              <Tooltip :title="record.isActive ? 'Désactiver' : 'Activer'">
                <Switch
                  :checked="record.isActive"
                  size="small"
                  @change="toggleActive(record)"
                />
              </Tooltip>
              <Tooltip title="Réinitialiser le mot de passe">
                <Button type="text" size="small" @click="handleResetPassword(record.id)">
                  <KeyOutlined />
                </Button>
              </Tooltip>
              <Popconfirm
                title="Supprimer ce membre ?"
                description="Cette action est irréversible."
                ok-text="Supprimer"
                cancel-text="Annuler"
                @confirm="handleDelete(record.id)"
              >
                <Tooltip title="Supprimer">
                  <Button type="text" size="small" danger>
                    <DeleteOutlined />
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Create/Edit Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="modalMode === 'create' ? 'Ajouter un membre' : 'Modifier un membre'"
      :confirm-loading="modalLoading"
      @ok="handleSave"
    >
      <Form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <FormItem label="Email" required>
          <Input
            v-model:value="formData.email"
            placeholder="email@example.com"
            :disabled="modalMode === 'edit'"
          />
        </FormItem>
        <FormItem label="Nom" required>
          <Input v-model:value="formData.name" placeholder="Nom complet" />
        </FormItem>
        <FormItem label="Rôle" required>
          <Select
            v-model:value="formData.role"
            :options="availableRoles.map((r) => ({ label: r.label, value: r.value }))"
            placeholder="Sélectionner un rôle"
          />
        </FormItem>
      </Form>
      <Alert
        v-if="modalMode === 'create'"
        type="info"
        show-icon
        message="Un mot de passe temporaire sera généré et affiché après la création."
        style="margin-top: 16px"
      />
    </Modal>

    <!-- Password Modal -->
    <Modal
      v-model:open="passwordModalVisible"
      title="Mot de passe temporaire"
      :footer="null"
    >
      <Alert
        type="warning"
        show-icon
        message="Conservez ce mot de passe"
        description="Ce mot de passe ne sera plus affiché. Communiquez-le au membre du personnel de manière sécurisée."
        style="margin-bottom: 16px"
      />
      <div class="password-display">
        <Input :value="tempPassword" readonly style="font-family: monospace" />
        <Button type="primary" @click="copyPassword">
          <CopyOutlined />
          Copier
        </Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.staff-view {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.filters-card {
  margin-bottom: 16px;
}

.password-display {
  display: flex;
  gap: 8px;
}
</style>
