<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AvailableDate } from '@/types';

const { t } = useI18n();

interface Props {
  availableDates: AvailableDate[];
  modelValue: string | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const currentMonth = ref(new Date());

const monthKeys = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dayNames = computed(() => dayKeys.map((key) => t(`daysShort.${key}`)));

const currentMonthLabel = computed(() => {
  const monthKey = monthKeys[currentMonth.value.getMonth()];
  return `${t(`months.${monthKey}`)} ${currentMonth.value.getFullYear()}`;
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of week for first day (0 = Sunday, we want 0 = Monday)
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const days: Array<{
    date: Date | null;
    dateString: string;
    dayNumber: number;
    isToday: boolean;
    isSelected: boolean;
    isAvailable: boolean;
    slotsAvailable: number;
    isPast: boolean;
    isCurrentMonth: boolean;
  }> = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < startDayOfWeek; i++) {
    const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
    days.push({
      date: prevDate,
      dateString: formatDateString(prevDate),
      dayNumber: prevDate.getDate(),
      isToday: false,
      isSelected: false,
      isAvailable: false,
      slotsAvailable: 0,
      isPast: true,
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateString = formatDateString(date);
    const availabilityInfo = props.availableDates.find((d) => d.date === dateString);

    days.push({
      date,
      dateString,
      dayNumber: day,
      isToday: date.getTime() === today.getTime(),
      isSelected: dateString === props.modelValue,
      isAvailable: availabilityInfo?.available ?? false,
      slotsAvailable: availabilityInfo?.slotsAvailable ?? 0,
      isPast: date < today,
      isCurrentMonth: true,
    });
  }

  // Add empty cells for days after the last day of month
  const remainingCells = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({
      date: nextDate,
      dateString: formatDateString(nextDate),
      dayNumber: i,
      isToday: false,
      isSelected: false,
      isAvailable: false,
      slotsAvailable: 0,
      isPast: false,
      isCurrentMonth: false,
    });
  }

  return days;
});

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousMonth() {
  const newDate = new Date(currentMonth.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentMonth.value = newDate;
}

function nextMonth() {
  const newDate = new Date(currentMonth.value);
  newDate.setMonth(newDate.getMonth() + 1);
  currentMonth.value = newDate;
}

function selectDate(day: (typeof calendarDays.value)[0]) {
  if (!day.isCurrentMonth || day.isPast || !day.isAvailable) return;
  emit('update:modelValue', day.dateString);
}

const canGoPrevious = computed(() => {
  const today = new Date();
  return (
    currentMonth.value.getFullYear() > today.getFullYear() ||
    (currentMonth.value.getFullYear() === today.getFullYear() &&
      currentMonth.value.getMonth() > today.getMonth())
  );
});

// Reset to current month when component mounts if showing past month
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      const selectedDate = new Date(newValue);
      currentMonth.value = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <!-- Month navigation -->
    <div class="mb-4 flex items-center justify-between">
      <button
        type="button"
        :disabled="!canGoPrevious"
        class="rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
        @click="previousMonth"
      >
        <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h3 class="text-lg font-semibold text-gray-900">{{ currentMonthLabel }}</h3>

      <button
        type="button"
        class="rounded-lg p-2 transition-colors hover:bg-gray-100"
        @click="nextMonth"
      >
        <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Day names -->
    <div class="mb-2 grid grid-cols-7 gap-1">
      <div
        v-for="dayName in dayNames"
        :key="dayName"
        class="py-2 text-center text-xs font-medium text-gray-500"
      >
        {{ dayName }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="relative grid grid-cols-7 gap-1">
      <!-- Loading overlay -->
      <div
        v-if="loading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-white/80"
      >
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>

      <button
        v-for="(day, index) in calendarDays"
        :key="index"
        type="button"
        :disabled="!day.isCurrentMonth || day.isPast || !day.isAvailable"
        :class="[
          'relative flex h-12 flex-col items-center justify-center rounded-lg text-sm transition-all',
          {
            // Not current month
            'text-gray-300': !day.isCurrentMonth,
            // Past days
            'cursor-not-allowed text-gray-300': day.isCurrentMonth && day.isPast,
            // Not available
            'cursor-not-allowed text-gray-400': day.isCurrentMonth && !day.isPast && !day.isAvailable,
            // Available
            'cursor-pointer hover:bg-teal-50': day.isCurrentMonth && !day.isPast && day.isAvailable && !day.isSelected,
            // Selected
            'bg-teal-500 text-white shadow-md': day.isSelected,
            // Today indicator
            'font-bold': day.isToday,
          },
        ]"
        @click="selectDate(day)"
      >
        <span>{{ day.dayNumber }}</span>

        <!-- Availability indicator -->
        <span
          v-if="day.isCurrentMonth && !day.isPast && day.isAvailable && !day.isSelected"
          class="absolute bottom-1 h-1 w-1 rounded-full bg-teal-500"
        />

        <!-- Today ring -->
        <span
          v-if="day.isToday && !day.isSelected"
          class="absolute inset-0 rounded-lg ring-2 ring-teal-500"
        />
      </button>
    </div>

    <!-- Legend -->
    <div class="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
      <span class="flex items-center gap-1">
        <span class="h-2 w-2 rounded-full bg-teal-500" />
        {{ t('reservation.available') }}
      </span>
      <span class="flex items-center gap-1">
        <span class="h-2 w-2 rounded-full bg-gray-300" />
        {{ t('reservation.unavailable') }}
      </span>
    </div>
  </div>
</template>
