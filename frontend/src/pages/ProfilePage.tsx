import { useAppSelector } from '@/store';

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="p-4 md:p-6">
      <h1 className="page-title mb-6">Profile</h1>

      <div className="card p-6">
        {user ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Name</label>
              <p className="text-lg font-medium">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <p className="text-lg">{user.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading profile...</p>
        )}
      </div>
    </div>
  );
}
