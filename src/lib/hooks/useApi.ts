'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface ApiResult<T> {
  data?: T;
  error?: Error;
  success: boolean;
}

export function useApi<T, Args extends unknown[]>(
  apiFn: (...args: Args) => Promise<ApiResult<T>>,
  options?: UseApiOptions<T>
) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (...args: Args) => {
    setLoading(true);

    try {
      const result = await apiFn(...args);

      if (result.success) {
        options?.onSuccess?.(result.data as T);
      } else {
        const errorMsg = result.error?.message || '操作失败';
        toast.error(errorMsg);
        options?.onError?.(result.error as Error);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      toast.error(errorMsg);
      options?.onError?.(error as Error);
      return { success: false, error: error as Error };
    } finally {
      setLoading(false);
    }
  }, [apiFn, options]);

  return { loading, execute };
}
