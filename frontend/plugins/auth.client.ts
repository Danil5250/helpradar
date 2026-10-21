// load the session before route guards run.
export default defineNuxtPlugin(async () => {
  await useAuth().fetchMe();
});
