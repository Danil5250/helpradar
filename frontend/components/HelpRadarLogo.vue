<template>
  <svg
    :viewBox="iconOnly ? '0 0 32 32' : '0 0 176 32'"
    :class="iconOnly ? 'h-8 w-8' : 'h-8 w-auto'"
    role="img"
    aria-label="HelpRadar"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g :class="variant === 'light' ? 'text-almost-white' : 'text-forest'" fill="none" stroke="currentColor">
      <circle cx="16" cy="16" r="14" stroke-width="2" opacity=".55" />
      <circle cx="16" cy="16" r="8.5" stroke-width="2" opacity=".8" />
      <path d="M16 16 L27 8" stroke-width="2.4" stroke-linecap="round" />
    </g>
    <circle cx="16" cy="16" r="2.8" fill="#FF8C00" />
    <circle cx="24.5" cy="23" r="2.2" fill="#FF8C00" />
    <text
      v-if="!iconOnly"
      x="42"
      y="23"
      font-size="21"
      font-weight="700"
      font-family="Montserrat-Regular, sans-serif"
      :fill="variant === 'light' ? '#FFFFFF' : '#1A2421'"
    >
      Help<tspan :fill="variant === 'light' ? '#EAE6D7' : '#4A5D23'">Radar</tspan>
    </text>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'dark' | 'light'; iconOnly?: boolean }>(), {
  variant: 'dark',
  iconOnly: false,
});
</script>
