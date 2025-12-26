<script setup lang="ts">
import { computed } from 'vue';
import type { ReservationStatus } from '@/types';
import { RESERVATION_STATUS_LABELS } from '@/types';

interface Props {
  status: ReservationStatus;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const statusConfig = computed(() => {
  const configs: Record<ReservationStatus, { bg: string; text: string; dot: string }> = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    confirmed: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    arrived: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
    },
    seated: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      dot: 'bg-green-500',
    },
    completed: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
    },
    cancelled: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
    no_show: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
  };
  return configs[props.status];
});

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  return sizes[props.size];
});

const dotSizeClasses = computed(() => {
  const sizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };
  return sizes[props.size];
});

const label = computed(() => RESERVATION_STATUS_LABELS[props.status]);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      statusConfig.bg,
      statusConfig.text,
      sizeClasses,
    ]"
  >
    <span :class="['rounded-full', statusConfig.dot, dotSizeClasses]" />
    {{ label }}
  </span>
</template>
