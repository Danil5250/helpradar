import withNuxt from './.nuxt/eslint.config.mjs';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default withNuxt(
  {
    ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'dist/**', 'coverage/**', '.cache/**'],
  },
  prettierRecommended,
  {
    rules: {
      'vue/no-v-html': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
    },
  }
);
