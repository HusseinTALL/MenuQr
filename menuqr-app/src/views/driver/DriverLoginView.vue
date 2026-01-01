<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDriverAuthStore } from '@/stores/driverAuth';
import { message } from 'ant-design-vue';
import {
  CarOutlined,
  MailOutlined,
  LockOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const driverStore = useDriverAuthStore();

const form = ref({
  email: '',
  password: '',
  remember: true,
});
const loading = ref(false);
const showPassword = ref(false);

const isFormValid = computed(() => {
  return form.value.email.trim() !== '' && form.value.password.length >= 6;
});

const handleLogin = async () => {
  if (!isFormValid.value) {return;}

  loading.value = true;
  try {
    const result = await driverStore.login(form.value.email, form.value.password);

    if (result.success) {
      message.success('Connexion réussie');
      router.push('/driver');
    } else {
      message.error(result.message || 'Échec de la connexion');
    }
  } catch {
    message.error('Une erreur est survenue');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo -->
      <div class="login-header">
        <div class="logo">
          <CarOutlined />
        </div>
        <h1>MenuQR Driver</h1>
        <p>Connectez-vous pour commencer à livrer</p>
      </div>

      <!-- Login Form -->
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <div class="input-wrapper">
            <MailOutlined class="input-icon" />
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="votre@email.com"
              autocomplete="email"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <div class="input-wrapper">
            <LockOutlined class="input-icon" />
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Votre mot de passe"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Masquer' : 'Afficher' }}
            </button>
          </div>
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="form.remember" />
            <span>Se souvenir de moi</span>
          </label>
          <a href="#" class="forgot-password">Mot de passe oublié?</a>
        </div>

        <button
          type="submit"
          class="login-btn"
          :disabled="!isFormValid || loading"
        >
          <span v-if="loading">Connexion...</span>
          <template v-else>
            Se connecter
            <RightOutlined />
          </template>
        </button>
      </form>

      <!-- Register Link -->
      <div class="register-link">
        <p>Pas encore livreur?</p>
        <router-link to="/driver/register">Devenir livreur partenaire</router-link>
      </div>

      <!-- Footer -->
      <div class="login-footer">
        <p>En vous connectant, vous acceptez nos</p>
        <div class="footer-links">
          <a href="#">Conditions d'utilisation</a>
          <span>•</span>
          <a href="#">Politique de confidentialité</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.3);
}

.login-header h1 {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.login-header p {
  color: rgba(255, 255, 255, 0.65);
  font-size: 15px;
  margin: 0;
}

.login-form {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 28px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 16px;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 14px 14px 42px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  transition: all 0.2s ease;
}

.input-wrapper input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.input-wrapper input:focus {
  outline: none;
  border-color: #1890ff;
  background: rgba(255, 255, 255, 0.08);
}

.toggle-password {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  cursor: pointer;
}

.remember-me input {
  accent-color: #1890ff;
}

.forgot-password {
  color: #1890ff;
  font-size: 13px;
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 24px;
}

.register-link p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0 0 4px 0;
}

.register-link a {
  color: #1890ff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}

.login-footer {
  text-align: center;
  margin-top: 32px;
}

.login-footer p {
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
  margin: 0 0 4px 0;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-decoration: none;
}

.footer-links a:hover {
  color: #1890ff;
}

.footer-links span {
  color: rgba(255, 255, 255, 0.3);
}
</style>
