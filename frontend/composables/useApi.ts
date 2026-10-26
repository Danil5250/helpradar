export interface ApiFieldError {
  code: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, ApiFieldError> = {},
    public readonly data: Record<string, any> = {},
  ) {
    super(message);
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }

  get isServerError(): boolean {
    return this.status >= 500 || this.isNetwork;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const e = error as any;
  const status: number = e?.statusCode ?? e?.status ?? e?.response?.status ?? 0;
  const data = e?.data ?? e?.response?._data;
  if (data && typeof data === 'object' && typeof data.code === 'string') {
    return new ApiError(status, data.code, String(data.message ?? ''), data.fields ?? {}, data);
  }
  return new ApiError(status, status ? 'HTTP_ERROR' : 'NETWORK', String(e?.message ?? 'Network error'));
}

export async function apiFetch<T>(path: string, options: Record<string, any> = {}): Promise<T> {
  try {
    return await $fetch<T>(`/api${path}`, { credentials: 'include', ...options });
  } catch (error) {
    throw toApiError(error);
  }
}

export function useApiErrorText() {
  const { t, te } = useI18n();
  return (error: ApiError, fallbackKey = 'errors.SERVER_ERROR'): string => {
    const params: Record<string, string> = {};
    if (error.code === 'ACCOUNT_BLOCKED') {
      const until = error.data.blockedUntil ? String(error.data.blockedUntil).slice(0, 10) : '';
      params.date = until;
      params.reason = error.data.reason || t('errors.REASON_NOT_SPECIFIED');
    }
    if (error.isServerError && error.code !== 'GEOCODER_UNAVAILABLE') return t(fallbackKey);
    if (te(`errors.${error.code}`)) return t(`errors.${error.code}`, params);
    return error.message || t(fallbackKey);
  };
}

export function useFieldErrorText() {
  const { t, te } = useI18n();
  return (code: string | undefined, fallback = ''): string => {
    if (!code) return '';
    return te(`errors.${code}`) ? t(`errors.${code}`) : fallback || code;
  };
}
