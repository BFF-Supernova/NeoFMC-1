import { useAuth } from '@/contexts/AuthContext';
import { api, handleApiError } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useSuperAdminDelete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const deleteRecord = async (entityType: string, id: string, label: string, queryKeys?: string[]) => {
    if (!isSuperAdmin) return false;

    try {
      await api.delete(`/super-admin/delete/${entityType}/${id}?confirm=true`);
      toast({
        title: 'تم الحذف بنجاح',
        description: `تم حذف ${label} بنجاح`,
      });
      if (queryKeys) {
        queryKeys.forEach(key => queryClient.invalidateQueries({ predicate: (query) => {
          const qk = query.queryKey;
          return Array.isArray(qk) && typeof qk[0] === 'string' && qk[0].includes(key);
        }}));
      }
      return true;
    } catch (err: any) {
      handleApiError(err, `فشل حذف ${label}`);
      return false;
    }
  };

  const bulkDelete = async (entityType: string, ids: string[], label: string, queryKeys?: string[]) => {
    if (!isSuperAdmin) return false;

    try {
      await api.post('/super-admin/delete/bulk', {
        entityType,
        ids,
        confirm: 'CONFIRM_BULK_DELETE',
      });
      toast({
        title: 'تم الحذف بنجاح',
        description: `تم حذف ${ids.length} ${label} بنجاح`,
      });
      if (queryKeys) {
        queryKeys.forEach(key => queryClient.invalidateQueries({ predicate: (query) => {
          const qk = query.queryKey;
          return Array.isArray(qk) && typeof qk[0] === 'string' && qk[0].includes(key);
        }}));
      }
      return true;
    } catch (err: any) {
      handleApiError(err, `فشل حذف ${label}`);
      return false;
    }
  };

  return { isSuperAdmin, deleteRecord, bulkDelete };
}
