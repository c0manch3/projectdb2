import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '@/store';
import { api } from '@/services/auth.service';
import { logout } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t('profile.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success(t('profile.passwordChanged'));
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      // Logout user so they can log in with new password
      setTimeout(() => {
        dispatch(logout());
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || t('profile.passwordChangeFailed');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="page-title mb-6">{t('profile.title')}</h1>

      <div className="card p-6 mb-6">
        {user ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">{t('profile.name')}</label>
              <p className="text-lg font-medium">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">{t('profile.email')}</label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">{t('profile.phone')}</label>
              <p className="text-lg">{user.phone || t('common.notSet')}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">{t('profile.role')}</label>
              <p className="text-lg">{user.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">{t('common.loading')}</p>
        )}
      </div>

      {/* Change Password Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('profile.security')}</h2>
        </div>

        {!showChangePassword ? (
          <button
            onClick={() => setShowChangePassword(true)}
            className="btn-secondary"
          >
            {t('profile.changePassword')}
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.currentPassword')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field w-full"
                placeholder={t('profile.enterCurrentPassword')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.newPassword')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field w-full"
                placeholder={t('profile.enterNewPassword')}
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full"
                placeholder={t('profile.confirmNewPassword')}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.loading') : t('profile.updatePassword')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
