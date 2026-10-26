export default defineNuxtRouteMiddleware(() => {
  if (useAuth().isAuthenticated.value) return navigateTo('/main');
});
