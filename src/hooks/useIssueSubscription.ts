import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useIssueStore } from '@/store/issueStore';
import { useUIStore } from '@/store/uiStore';
import { subscribeToIssues } from '@/services/firebase/issueService';

export function useIssueSubscription() {
  const user = useAuthStore((s) => s.user);
  const { setIssues, setLoading, setError, loadCachedIssues } = useIssueStore();
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    loadCachedIssues();

    const unsub = subscribeToIssues(
      user.role,
      user.uid,
      (issues) => {
        setIssues(issues);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(err.message);
        showToast('Failed to load issues', 'error');
      }
    );

    return unsub;
  }, [user?.uid, user?.role]);
}
