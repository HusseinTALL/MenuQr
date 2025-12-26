<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/services/api';
import type { FulfillmentType, ScheduledOrderSlot } from '@/types/scheduledOrder';

const { t } = useI18n();

interface AvailableDate {
  date: string;
  dayOfWeek: string;
  isOpen: boolean;
  slotsAvailable: number;
}

interface Props {
  restaurantId: string;
  fulfillmentType: FulfillmentType;
  selectedDate: string | null;
  selectedTime: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selectedDate': [value: string | null];
  'update:selectedTime': [value: string | null];
}>();

// State
const isLoadingDates = ref(true);
const isLoadingSlots = ref(false);
const availableDates = ref<AvailableDate[]>([]);
const timeSlots = ref<ScheduledOrderSlot[]>([]);
const error = ref<string | null>(null);

// Calendar state
const currentMonth = ref(new Date());

// Day keys for i18n (Sunday = 0 in JS)
const dayKeysFromSunday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Generate local dates as fallback (when API is not available)
const generateLocalDates = (days: number): AvailableDate[] => {
  const dates: AvailableDate[] = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = date.toISOString().split('T')[0];
    const dayKey = dayKeysFromSunday[date.getDay()];
    const dayOfWeek = t(`days.${dayKey}`);

    // Consider all days open except maybe some logic later
    dates.push({
      date: dateStr,
      dayOfWeek,
      isOpen: true,
      slotsAvailable: 10, // Default available slots
    });
  }

  return dates;
};

// Load available dates
const loadAvailableDates = async () => {
  isLoadingDates.value = true;
  error.value = null;

  try {
    const response = await api.getScheduledOrderAvailability(props.restaurantId, { days: 14 });
    if (response.success && response.data) {
      availableDates.value = response.data.dates;
    } else {
      // Fallback to local generation
      availableDates.value = generateLocalDates(14);
    }
  } catch (err) {
    console.error('Failed to load available dates, using local fallback:', err);
    // Use local fallback instead of showing error
    availableDates.value = generateLocalDates(14);
  } finally {
    isLoadingDates.value = false;
  }
};

// Generate local time slots as fallback
const generateLocalTimeSlots = (): ScheduledOrderSlot[] => {
  const slots: ScheduledOrderSlot[] = [];

  // Morning slots: 10:00 - 11:30
  for (let hour = 10; hour <= 11; hour++) {
    for (const minute of ['00', '30']) {
      if (hour === 11 && minute === '30') continue; // Skip 11:30
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: true,
        remainingCapacity: 5,
      });
    }
  }

  // Lunch slots: 12:00 - 14:00
  for (let hour = 12; hour <= 14; hour++) {
    for (const minute of ['00', '30']) {
      if (hour === 14 && minute === '30') continue;
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: true,
        remainingCapacity: 5,
      });
    }
  }

  // Afternoon slots: 15:00 - 17:30
  for (let hour = 15; hour <= 17; hour++) {
    for (const minute of ['00', '30']) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: true,
        remainingCapacity: 5,
      });
    }
  }

  // Evening slots: 18:00 - 21:00
  for (let hour = 18; hour <= 21; hour++) {
    for (const minute of ['00', '30']) {
      if (hour === 21 && minute === '30') continue;
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: true,
        remainingCapacity: 5,
      });
    }
  }

  return slots;
};

// Load time slots for selected date
const loadTimeSlots = async (date: string) => {
  if (props.fulfillmentType === 'dine_in') return;

  isLoadingSlots.value = true;

  try {
    const response = await api.getScheduledOrderSlots(
      props.restaurantId,
      date,
      props.fulfillmentType as 'pickup' | 'delivery'
    );
    if (response.success && response.data) {
      timeSlots.value = response.data;
    } else {
      // Fallback to local generation
      timeSlots.value = generateLocalTimeSlots();
    }
  } catch (err) {
    console.error('Failed to load time slots, using local fallback:', err);
    // Use local fallback
    timeSlots.value = generateLocalTimeSlots();
  } finally {
    isLoadingSlots.value = false;
  }
};

// Watch for date changes to load slots
watch(
  () => props.selectedDate,
  (newDate) => {
    if (newDate) {
      loadTimeSlots(newDate);
    } else {
      timeSlots.value = [];
    }
  }
);

// Calendar helpers
const monthKeys = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const dayKeysOrdered = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dayNames = computed(() => dayKeysOrdered.map((key) => t(`daysShort.${key}`)));

const currentMonthName = computed(() => {
  const monthKey = monthKeys[currentMonth.value.getMonth()];
  return `${t(`months.${monthKey}`)} ${currentMonth.value.getFullYear()}`;
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  // First day of month (0 = Sunday, adjust to Monday = 0)
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid
  const days: { date: string; day: number; isCurrentMonth: boolean; isAvailable: boolean; slotsCount: number }[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, isCurrentMonth: false, isAvailable: false, slotsCount: 0 });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const availableDate = availableDates.value.find((ad) => ad.date === dateStr);
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: true,
      isAvailable: availableDate?.isOpen && (availableDate?.slotsAvailable ?? 0) > 0,
      slotsCount: availableDate?.slotsAvailable ?? 0,
    });
  }

  // Next month padding (fill to 42 cells = 6 rows)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, isCurrentMonth: false, isAvailable: false, slotsCount: 0 });
  }

  return days;
});

const isPastDate = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date < today;
};

const isToday = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

const canGoPrevMonth = computed(() => {
  const today = new Date();
  const currentMonthStart = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return currentMonthStart > todayMonthStart;
});

const goToPrevMonth = () => {
  if (canGoPrevMonth.value) {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
  }
};

const goToNextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
};

const selectDate = (dateStr: string) => {
  emit('update:selectedDate', dateStr);
  emit('update:selectedTime', null);
};

const selectTime = (time: string) => {
  emit('update:selectedTime', time);
};

// Group time slots by period
const groupedSlots = computed(() => {
  const groups = [
    { label: 'Matin', icon: '🌅', slots: [] as ScheduledOrderSlot[] },
    { label: 'Midi', icon: '☀️', slots: [] as ScheduledOrderSlot[] },
    { label: 'Après-midi', icon: '🌤️', slots: [] as ScheduledOrderSlot[] },
    { label: 'Soir', icon: '🌙', slots: [] as ScheduledOrderSlot[] },
  ];

  for (const slot of timeSlots.value) {
    const hour = parseInt(slot.time.split(':')[0], 10);
    if (hour >= 6 && hour < 11) {
      groups[0].slots.push(slot);
    } else if (hour >= 11 && hour < 14) {
      groups[1].slots.push(slot);
    } else if (hour >= 14 && hour < 18) {
      groups[2].slots.push(slot);
    } else {
      groups[3].slots.push(slot);
    }
  }

  return groups.filter((g) => g.slots.length > 0);
});

// Initialize
onMounted(() => {
  loadAvailableDates();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Date Selection -->
    <div>
      <h3 class="mb-3 text-lg font-semibold text-gray-900">Choisissez une date</h3>

      <!-- Loading -->
      <div v-if="isLoadingDates" class="flex items-center justify-center py-8">
        <svg class="h-8 w-8 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-xl bg-red-50 p-4 text-center text-red-700">
        {{ error }}
      </div>

      <!-- Calendar -->
      <div v-else class="rounded-2xl bg-white p-4 shadow-sm">
        <!-- Month Navigation -->
        <div class="mb-4 flex items-center justify-between">
          <button
            type="button"
            :disabled="!canGoPrevMonth"
            class="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
            @click="goToPrevMonth"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 class="text-base font-semibold text-gray-900">{{ currentMonthName }}</h4>
          <button
            type="button"
            class="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
            @click="goToNextMonth"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Day Headers -->
        <div class="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
          <div v-for="day in dayNames" :key="day">{{ day }}</div>
        </div>

        <!-- Calendar Grid -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="day in calendarDays"
            :key="day.date"
            type="button"
            :disabled="!day.isCurrentMonth || !day.isAvailable || isPastDate(day.date)"
            class="relative flex h-10 items-center justify-center rounded-lg text-sm transition-all"
            :class="[
              day.date === selectedDate
                ? 'bg-teal-500 font-semibold text-white'
                : day.isCurrentMonth && day.isAvailable && !isPastDate(day.date)
                  ? 'font-medium text-gray-900 hover:bg-teal-100'
                  : 'text-gray-300',
              isToday(day.date) && day.date !== selectedDate ? 'ring-2 ring-teal-400 ring-inset' : '',
            ]"
            @click="day.isAvailable && !isPastDate(day.date) && selectDate(day.date)"
          >
            {{ day.day }}
            <!-- Availability dot -->
            <span
              v-if="day.isCurrentMonth && day.isAvailable && !isPastDate(day.date) && day.date !== selectedDate"
              class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-teal-500"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Time Selection (only if date is selected) -->
    <div v-if="selectedDate">
      <h3 class="mb-3 text-lg font-semibold text-gray-900">Choisissez une heure</h3>

      <!-- Loading -->
      <div v-if="isLoadingSlots" class="flex items-center justify-center py-8">
        <svg class="h-8 w-8 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- No slots -->
      <div
        v-else-if="timeSlots.length === 0"
        class="rounded-xl bg-amber-50 p-4 text-center text-amber-700"
      >
        Aucun créneau disponible pour cette date
      </div>

      <!-- Time Slots -->
      <div v-else class="space-y-4">
        <div v-for="group in groupedSlots" :key="group.label">
          <div class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
            <span>{{ group.icon }}</span>
            <span>{{ group.label }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="slot in group.slots"
              :key="slot.time"
              type="button"
              :disabled="!slot.available"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-all"
              :class="[
                slot.time === selectedTime
                  ? 'border-teal-500 bg-teal-500 text-white'
                  : slot.available
                    ? 'border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50'
                    : 'border-gray-100 bg-gray-50 text-gray-300',
              ]"
              @click="slot.available && selectTime(slot.time)"
            >
              {{ slot.time }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selection Summary -->
    <div
      v-if="selectedDate && selectedTime"
      class="rounded-xl bg-teal-50 p-4"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-xl">
          📅
        </div>
        <div>
          <p class="font-semibold text-teal-900">
            {{
              new Date(selectedDate).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            }}
          </p>
          <p class="text-sm text-teal-700">à {{ selectedTime }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
