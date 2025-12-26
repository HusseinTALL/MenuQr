<script setup lang="ts">
import { computed } from 'vue';
import type { PreOrder } from '@/types';

interface Props {
  preOrder: PreOrder;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
});

const emit = defineEmits<{
  edit: [];
  remove: [index: number];
}>();

const totalItems = computed(() => {
  return props.preOrder.items.reduce((sum, item) => sum + item.quantity, 0);
});
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900">Pré-commande</h4>
          <p class="text-xs text-gray-500">{{ totalItems }} article{{ totalItems > 1 ? 's' : '' }}</p>
        </div>
      </div>

      <button
        v-if="editable"
        type="button"
        class="text-sm font-medium text-teal-600 hover:text-teal-700"
        @click="emit('edit')"
      >
        Modifier
      </button>
    </div>

    <!-- Items list -->
    <div class="divide-y divide-gray-100">
      <div
        v-for="(item, index) in preOrder.items"
        :key="index"
        class="flex items-start justify-between gap-3 px-4 py-3"
      >
        <div class="flex-1">
          <div class="flex items-start gap-2">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
              {{ item.quantity }}
            </span>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ item.name }}</p>

              <!-- Options -->
              <div v-if="item.options && item.options.length > 0" class="mt-1">
                <p
                  v-for="(option, optIdx) in item.options"
                  :key="optIdx"
                  class="text-xs text-gray-500"
                >
                  {{ option.name }}: {{ option.choice }}
                  <span v-if="option.price > 0" class="text-teal-600">
                    (+{{ option.price.toLocaleString('fr-FR') }} FCFA)
                  </span>
                </p>
              </div>

              <!-- Notes -->
              <p v-if="item.notes" class="mt-1 text-xs italic text-gray-500">
                "{{ item.notes }}"
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-900">
            {{ item.totalPrice.toLocaleString('fr-FR') }} FCFA
          </span>

          <button
            v-if="editable"
            type="button"
            class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click="emit('remove', index)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="preOrder.notes" class="border-t border-gray-100 px-4 py-3">
      <p class="text-sm text-gray-600">
        <span class="font-medium">Instructions :</span> {{ preOrder.notes }}
      </p>
    </div>

    <!-- Total -->
    <div class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
      <span class="font-medium text-gray-700">Total pré-commande</span>
      <span class="text-lg font-bold text-teal-600">
        {{ preOrder.subtotal.toLocaleString('fr-FR') }} FCFA
      </span>
    </div>
  </div>
</template>
