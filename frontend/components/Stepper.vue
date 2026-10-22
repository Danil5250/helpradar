<template>
  <div class="flex items-center justify-start w-1/4" role="list">
    <div v-for="step in steps" :key="step" class="flex-1" role="listitem">
      <button
        type="button"
        class="block h-2 rounded-full mr-2 transition-all duration-500"
        :class="step === currentStep ? 'bg-forest w-12' : step < currentStep ? 'bg-forest w-8' : 'bg-sage/40 w-8'"
        :aria-current="step === currentStep ? 'step' : undefined"
        :aria-label="`${step}`"
        :disabled="step > currentStep"
        @click="emit('stepChange', step)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Emits
const emit = defineEmits<{ stepChange: [step: number] }>();

// Utils
withDefaults(defineProps<{ currentStep: number; steps?: number }>(), { steps: 3 });
</script>
