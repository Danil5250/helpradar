export type UserRole = 'guest' | 'person_in_need' | 'volunteer' | 'administrator';

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phoneNumber: string | null;
  city: string | null;
  avatarUrl: string;
}

interface SessionResponse {
  user: AuthUser;
  expiresAt: string;
  message?: string;
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth.user', () => null);
  const loaded = useState<boolean>('auth.loaded', () => false);

  const isAuthenticated = computed(() => user.value !== null);
  const role = computed<UserRole | null>(() => user.value?.role ?? null);
  const canPublish = computed(() => role.value === 'person_in_need' || role.value === 'volunteer');

  async function fetchMe(): Promise<void> {
    try {
      // guests receive a successful null response.
      user.value = (await apiFetch<{ user: AuthUser | null }>('/auth/me')).user;
    } catch {
      user.value = null;
    } finally {
      loaded.value = true;
    }
  }

  async function login(email: string, password: string): Promise<SessionResponse> {
    const result = await apiFetch<SessionResponse>('/auth/login', { method: 'POST', body: { email, password } });
    user.value = result.user;
    return result;
  }

  async function verifyEmail(token: string): Promise<SessionResponse> {
    const result = await apiFetch<SessionResponse>('/auth/verify-email', { method: 'POST', body: { token } });
    user.value = result.user;
    return result;
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      user.value = null;
    }
  }

  function sessionEnded(): void {
    user.value = null;
  }

  return { user, loaded, isAuthenticated, role, canPublish, fetchMe, login, verifyEmail, logout, sessionEnded };
};
