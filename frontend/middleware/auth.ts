export default defineNuxtRouteMiddleware((to) => {
  if (!useAuth().isAuthenticated.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
});
