<template>
  <div class="w-full mb-4">
    <span id="category-label" class="font-montserratRegular mb-2 block">{{ t('enter_type_of_help') }}*</span>
    <div class="flex mt-4 gap-2 flex-wrap" role="radiogroup" aria-labelledby="category-label" aria-describedby="category-error" :aria-invalid="!!error">
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        role="radio"
        :aria-checked="model === category.id"
        class="py-2 px-4 rounded-full mt-1 border-2 text-center transition"
        :class="model === category.id ? 'bg-forest border-forest text-almost-white' : 'border-sage bg-almost-white hover:border-olive hover:ring-2 hover:ring-olive/40'"
        :data-test="`category-${category.id}`"
        @click="model = category.id"
      >
        {{ t(`category.${category.id}`, category.name) }}
      </button>
    </div>
    <FieldError id="category-error" :text="fieldText(error)" />
  </div>
</template>

<script setup lang="ts">
import type { Category } from '~/types/announcement';

defineProps<{ categories: Category[]; error?: string }>();
const model = defineModel<number | null>({ required: true });
const { t } = useI18n();
const fieldText = useFieldErrorText();
</script>
