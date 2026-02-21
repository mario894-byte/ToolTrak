import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Mail, UserPlus, Check } from 'lucide-react';

type InviteUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleAddUser() {
    if (!email.trim()) {
      alert(t('invite.emailRequired'));
      return;
    }

    const emailLower = email.trim().toLowerCase();

    setLoading(true);
    try {
      const { error } = await supabase
        .from('allowed_emails')
        .insert({
          email: emailLower,
          is_admin: isAdmin,
        });

      if (error) {
        if (error.code === '23505') {
          alert('This email is already authorized to access the system.');
        } else {
          console.error('Error adding user:', error);
          alert(error.message || 'Failed to add user. Please try again.');
        }
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      alert(error.message || t('invite.error'));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setEmail('');
    setIsAdmin(false);
    setSuccess(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('invite.title')}</h2>
              <p className="text-sm text-gray-500">{t('invite.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!success ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invite.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('invite.emailPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invite.roleLabel')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      checked={!isAdmin}
                      onChange={() => setIsAdmin(false)}
                      className="w-4 h-4 text-blue-600"
                      disabled={loading}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{t('invite.regularUser')}</div>
                      <div className="text-sm text-gray-500">{t('invite.regularUserDesc')}</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      checked={isAdmin}
                      onChange={() => setIsAdmin(true)}
                      className="w-4 h-4 text-blue-600"
                      disabled={loading}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{t('invite.admin')}</div>
                      <div className="text-sm text-gray-500">{t('invite.adminDesc')}</div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleAddUser}
                disabled={loading || !email.trim()}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding user...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Add User</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-emerald-900 mb-1">User Added Successfully</h3>
                    <p className="text-sm text-emerald-700">
                      <strong>{email}</strong> can now sign up and access the system{isAdmin ? ' as an administrator' : ''}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  The user can now create an account using the email <strong>{email}</strong> at the sign-up page.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
