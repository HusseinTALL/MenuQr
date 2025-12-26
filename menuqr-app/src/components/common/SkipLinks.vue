<script setup lang="ts">
interface SkipLink {
  id: string;
  label: string;
}

withDefaults(
  defineProps<{
    links?: SkipLink[];
  }>(),
  {
    links: () => [
      { id: 'main-content', label: 'Aller au contenu principal' },
      { id: 'main-nav', label: 'Aller à la navigation' },
    ],
  }
);

const skipTo = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<template>
  <nav class="skip-links" aria-label="Liens d'accès rapide">
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.id}`"
      class="skip-link"
      @click.prevent="skipTo(link.id)"
    >
      {{ link.label }}
    </a>
  </nav>
</template>

<style scoped>
.skip-links {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
}

.skip-link {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  padding: 1rem 1.5rem;
  background: var(--color-primary-600, #16a34a);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

.skip-link:focus {
  position: static;
  width: auto;
  height: auto;
  outline: 2px solid var(--color-primary-800, #166534);
  outline-offset: 2px;
}
</style>
