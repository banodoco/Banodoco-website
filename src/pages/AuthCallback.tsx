import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user && profile?.username) {
      navigate(`/u/${profile.username}`, { replace: true });
    } else if (user) {
      // User exists but profile may not have a username yet
      navigate('/', { replace: true });
    } else {
      // No user after loading completes — auth failed or was cancelled
      navigate('/', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
