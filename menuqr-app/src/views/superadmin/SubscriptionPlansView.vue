<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import api from '@/services/api';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  CrownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import { Modal, message } from 'ant-design-vue';

interface PlanLimits {
  dishes: number;
  orders: number;
  users: number;
  smsCredits: number;
  storage: number;
  tables: number;
  campaigns: number;
}

interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  limits: PlanLimits;
  pricing: PlanPricing;
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
}

interface PlanForm {
  name: string;
  description: string;
  features: string;
  limits: PlanLimits;
  pricing: PlanPricing;
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

const loading = ref(true);
const plans = ref<Plan[]>([]);
const subscriptionCounts = ref<Record<string, number>>({});

// Modal state
const modalVisible = ref(false);
const modalLoading = ref(false);
const isEditing = ref(false);
const editingPlanId = ref<string | null>(null);

const defaultLimits: PlanLimits = {
  dishes: 50,
  orders: 500,
  users: 2,
  smsCredits: 100,
  storage: 500,
  tables: 10,
  campaigns: 5,
};

const defaultPricing: PlanPricing = {
  monthly: 0,
  yearly: 0,
  currency: 'EUR',
};

const planForm = ref<PlanForm>({
  name: '',
  description: '',
  features: '',
  limits: { ...defaultLimits },
  pricing: { ...defaultPricing },
  trialDays: 14,
  isActive: true,
  isPopular: false,
  sortOrder: 0,
});

const modalTitle = computed(() => {
  return isEditing.value ? 'Modifier le plan' : 'Nouveau plan';
});

const fetchPlans = async () => {
  loading.value = true;
  try {
    const response = await api.get<{ plans: Plan[] }>('/superadmin/subscription-plans');

    if (response.success && response.data) {
      plans.value = response.data.plans;

      // Fetch subscription counts for each plan
      for (const plan of plans.value) {
        const detailResponse = await api.get<{ plan: Plan; subscriptionCount: number }>(
          `/superadmin/subscription-plans/${plan._id}`
        );
        if (detailResponse.success && detailResponse.data) {
          subscriptionCounts.value[plan._id] = detailResponse.data.subscriptionCount;
        }
      }
    }
  } catch (_error) {
    console.error('Failed to fetch plans:');
    message.error('Erreur lors du chargement des plans');
  } finally {
    loading.value = false;
  }
};

const formatLimit = (value: number): string => {
  if (value === -1) {return 'Illimite';}
  if (value >= 1000) {return `${(value / 1000).toFixed(0)}k`;}
  return value.toString();
};

const openCreateModal = () => {
  isEditing.value = false;
  editingPlanId.value = null;
  planForm.value = {
    name: '',
    description: '',
    features: '',
    limits: { ...defaultLimits },
    pricing: { ...defaultPricing },
    trialDays: 14,
    isActive: true,
    isPopular: false,
    sortOrder: plans.value.length,
  };
  modalVisible.value = true;
};

const openEditModal = (plan: Plan) => {
  isEditing.value = true;
  editingPlanId.value = plan._id;
  planForm.value = {
    name: plan.name,
    description: plan.description,
    features: plan.features.join('\n'),
    limits: { ...plan.limits },
    pricing: { ...plan.pricing },
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
  };
  modalVisible.value = true;
};

const closeModal = () => {
  modalVisible.value = false;
  isEditing.value = false;
  editingPlanId.value = null;
};

const handleSubmit = async () => {
  if (!planForm.value.name || !planForm.value.description) {
    message.error('Le nom et la description sont obligatoires');
    return;
  }

  modalLoading.value = true;
  try {
    const payload = {
      name: planForm.value.name,
      description: planForm.value.description,
      features: planForm.value.features.split('\n').filter(f => f.trim()),
      limits: planForm.value.limits,
      pricing: planForm.value.pricing,
      trialDays: planForm.value.trialDays,
      isActive: planForm.value.isActive,
      isPopular: planForm.value.isPopular,
      sortOrder: planForm.value.sortOrder,
    };

    let response;
    if (isEditing.value && editingPlanId.value) {
      response = await api.put(`/superadmin/subscription-plans/${editingPlanId.value}`, payload);
    } else {
      response = await api.post('/superadmin/subscription-plans', payload);
    }

    if (response.success) {
      message.success(isEditing.value ? 'Plan modifie avec succes' : 'Plan cree avec succes');
      closeModal();
      fetchPlans();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch (_error) {
    console.error('Failed to save plan:');
    message.error('Erreur lors de l\'enregistrement');
  } finally {
    modalLoading.value = false;
  }
};

const togglePlanStatus = async (plan: Plan) => {
  try {
    const response = await api.put(`/superadmin/subscription-plans/${plan._id}`, {
      isActive: !plan.isActive,
    });

    if (response.success) {
      message.success(`Plan ${plan.isActive ? 'desactive' : 'active'} avec succes`);
      fetchPlans();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch (_error) {
    console.error('Failed to toggle plan status:');
    message.error('Erreur lors de la modification');
  }
};

const deletePlan = (plan: Plan) => {
  const count = subscriptionCounts.value[plan._id] || 0;

  if (count > 0) {
    message.warning(`Impossible de supprimer: ${count} abonnement(s) utilisent ce plan`);
    return;
  }

  Modal.confirm({
    title: 'Supprimer le plan ?',
    icon: h(ExclamationCircleOutlined),
    content: h('div', {}, [
      h('p', {}, 'Cette action est irreversible.'),
      h('p', { style: 'font-weight: 600; margin-top: 8px;' }, plan.name),
    ]),
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        const response = await api.delete(`/superadmin/subscription-plans/${plan._id}`);

        if (response.success) {
          message.success('Plan supprime avec succes');
          fetchPlans();
        } else {
          message.error(response.message || 'Une erreur est survenue');
        }
      } catch (_error) {
        console.error('Failed to delete plan:');
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

onMounted(() => {
  fetchPlans();
});
</script>

<template>
  <div class="subscription-plans-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Plans d'abonnement</h1>
        <p class="page-subtitle">Gerez les differents plans tarifaires</p>
      </div>
      <a-space>
        <a-button @click="fetchPlans" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Nouveau plan
        </a-button>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-row :gutter="[24, 24]">
        <a-col v-for="plan in plans" :key="plan._id" :xs="24" :md="12" :lg="8">
          <a-card class="plan-card" :class="{ 'popular-plan': plan.isPopular }" hoverable>
            <template v-if="plan.isPopular" #cover>
              <div class="popular-badge">
                <CrownOutlined /> Populaire
              </div>
            </template>

            <div class="plan-header">
              <h3>{{ plan.name }}</h3>
              <a-tag :color="plan.isActive ? 'green' : 'red'">
                {{ plan.isActive ? 'Actif' : 'Inactif' }}
              </a-tag>
            </div>

            <p class="plan-description">{{ plan.description }}</p>

            <div class="plan-pricing">
              <span class="price">{{ plan.pricing.monthly }}</span>
              <span class="currency">{{ plan.pricing.currency }}</span>
              <span class="period">/mois</span>
            </div>
            <div class="yearly-price">
              ou {{ plan.pricing.yearly }} {{ plan.pricing.currency }}/an
            </div>

            <div class="subscription-count">
              <a-badge :count="subscriptionCounts[plan._id] || 0" :overflow-count="999" show-zero>
                <span class="count-label">abonnements actifs</span>
              </a-badge>
            </div>

            <a-divider />

            <div class="plan-features">
              <h4>Fonctionnalites</h4>
              <ul>
                <li v-for="feature in plan.features" :key="feature">
                  <CheckOutlined class="feature-icon" /> {{ feature }}
                </li>
              </ul>
            </div>

            <div class="plan-limits">
              <h4>Limites</h4>
              <div class="limits-grid">
                <div class="limit-item">
                  <span class="limit-value">{{ formatLimit(plan.limits.dishes) }}</span>
                  <span class="limit-label">Plats</span>
                </div>
                <div class="limit-item">
                  <span class="limit-value">{{ formatLimit(plan.limits.orders) }}</span>
                  <span class="limit-label">Commandes</span>
                </div>
                <div class="limit-item">
                  <span class="limit-value">{{ formatLimit(plan.limits.users) }}</span>
                  <span class="limit-label">Utilisateurs</span>
                </div>
                <div class="limit-item">
                  <span class="limit-value">{{ formatLimit(plan.limits.tables) }}</span>
                  <span class="limit-label">Tables</span>
                </div>
                <div class="limit-item">
                  <span class="limit-value">{{ formatLimit(plan.limits.smsCredits) }}</span>
                  <span class="limit-label">SMS</span>
                </div>
                <div class="limit-item">
                  <span class="limit-value">{{ plan.trialDays }}j</span>
                  <span class="limit-label">Essai</span>
                </div>
              </div>
            </div>

            <a-divider />

            <div class="plan-actions">
              <a-button @click="openEditModal(plan)">
                <template #icon><EditOutlined /></template>
                Modifier
              </a-button>
              <a-button @click="togglePlanStatus(plan)">
                <template #icon>
                  <CloseOutlined v-if="plan.isActive" />
                  <CheckOutlined v-else />
                </template>
                {{ plan.isActive ? 'Desactiver' : 'Activer' }}
              </a-button>
              <a-button
                danger
                :disabled="(subscriptionCounts[plan._id] || 0) > 0"
                @click="deletePlan(plan)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-empty v-if="plans.length === 0 && !loading" description="Aucun plan configure" />
    </a-spin>

    <!-- Create/Edit Plan Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="modalLoading"
      width="700px"
      ok-text="Enregistrer"
      cancel-text="Annuler"
      @ok="handleSubmit"
      @cancel="closeModal"
    >
      <a-form layout="vertical" class="plan-form">
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="Nom du plan" required>
              <a-input v-model:value="planForm.name" placeholder="Ex: Starter, Pro, Enterprise" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Ordre d'affichage">
              <a-input-number v-model:value="planForm.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Description" required>
          <a-textarea
            v-model:value="planForm.description"
            placeholder="Description courte du plan"
            :rows="2"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Prix mensuel (EUR)">
              <a-input-number v-model:value="planForm.pricing.monthly" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Prix annuel (EUR)">
              <a-input-number v-model:value="planForm.pricing.yearly" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Jours d'essai">
              <a-input-number v-model:value="planForm.trialDays" :min="0" :max="90" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Fonctionnalites (une par ligne)">
          <a-textarea
            v-model:value="planForm.features"
            placeholder="Menu digital&#10;QR codes&#10;Support email"
            :rows="4"
          />
        </a-form-item>

        <a-divider>Limites</a-divider>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Plats (-1 = illimite)">
              <a-input-number v-model:value="planForm.limits.dishes" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Commandes/mois">
              <a-input-number v-model:value="planForm.limits.orders" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Utilisateurs">
              <a-input-number v-model:value="planForm.limits.users" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Tables">
              <a-input-number v-model:value="planForm.limits.tables" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Credits SMS">
              <a-input-number v-model:value="planForm.limits.smsCredits" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Stockage (MB)">
              <a-input-number v-model:value="planForm.limits.storage" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Campagnes/mois">
              <a-input-number v-model:value="planForm.limits.campaigns" :min="-1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Plan actif">
              <a-switch v-model:checked="planForm.isActive" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Plan populaire">
              <a-switch v-model:checked="planForm.isPopular" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.subscription-plans-view {
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

.plan-card {
  border-radius: 12px;
  height: 100%;
  position: relative;
}

.plan-card.popular-plan {
  border: 2px solid #8b5cf6;
}

.popular-badge {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  color: white;
  text-align: center;
  padding: 8px;
  font-weight: 600;
  font-size: 12px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.plan-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.plan-description {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}

.plan-pricing {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price {
  font-size: 36px;
  font-weight: 700;
  color: #8b5cf6;
}

.currency {
  font-size: 18px;
  font-weight: 600;
  color: #8b5cf6;
}

.period {
  font-size: 14px;
  color: #64748b;
}

.yearly-price {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.subscription-count {
  margin-bottom: 8px;
}

.count-label {
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
}

.plan-features h4,
.plan-limits h4 {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.plan-features ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-features li {
  margin-bottom: 4px;
  color: #1e293b;
  font-size: 13px;
}

.feature-icon {
  color: #10b981;
  margin-right: 8px;
}

.limits-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.limit-item {
  text-align: center;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
}

.limit-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.limit-label {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
}

.plan-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-form {
  margin-top: 16px;
}
</style>
