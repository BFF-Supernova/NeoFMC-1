import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export function useHiddenFields() {
  const { data: hiddenFields, isLoading } = useQuery({
    queryKey: ['/api/tenants/my/hidden-fields'],
    queryFn: () => apiFetch<Record<string, boolean>>('/tenants/my/hidden-fields'),
    staleTime: 5 * 60 * 1000,
  });

  const isHidden = (fieldKey: string): boolean => {
    if (!hiddenFields) return false;
    return !!hiddenFields[fieldKey];
  };

  return { hiddenFields: hiddenFields || {}, isHidden, isLoading };
}
