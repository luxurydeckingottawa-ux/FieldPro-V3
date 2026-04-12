import React, { useState } from 'react';
import { User, Role } from '../types';
import { APP_USERS } from '../constants';
import { UserPlus, Trash2, Edit2, X, AlertCircle, Database } from 'lucide-react';

interface UserManagementViewProps {
  onBack: () => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('luxury_decking_users_v1');
    return saved ? JSON.parse(saved) : APP_USERS;
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    role: Role.FIELD_EMPLOYEE
  });

  const saveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('luxury_decking_users_v1', JSON.stringify(updatedUsers));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.role) return;

    const user: User = {
      id: `u-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as Role,
      password: 'password123' // Default password
    };

    saveUsers([...users, user]);
    setIsAdding(false);
    setNewUser({ role: Role.FIELD_EMPLOYEE });
  };

  const handleUpdateRole = (userId: string, newRole: Role) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    saveUsers(updated);
    setEditingId(null);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      const updated = users.filter(u => u.id !== userId);
      saveUsers(updated);
    }
  };
  
  const handleClearCache = () => {
    if (window.confirm('This will clear all cached field data, site intakes, and chat history. Your main job list and users will remain. Are you sure?')) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('estimator_intake_') || 
          key.startsWith('luxury_decking_chat_') ||
          key.startsWith('luxury_decking_app_state_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      alert(`Cleared ${keysToRemove.length} cached records. The app will now reload.`);
      window.location.reload();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">System Administration</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage team members and system storage.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-primary)] text-rose-600 border border-rose-200 rounded-xl font-bold hover:bg-rose-50 transition-all"
          >
            <Database className="w-5 h-5" />
            Clear System Cache
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--brand-gold)] text-white rounded-xl font-bold hover:bg-[var(--brand-gold)] transition-all shadow-lg shadow-[var(--brand-gold)]/20"
          >
            <UserPlus className="w-5 h-5" />
            Add Team Member
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[var(--brand-gold)]" />
              New Team Member
            </h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                required
                value={newUser.name || ''}
                onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--brand-gold)] outline-none"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                required
                value={newUser.email || ''}
                onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--brand-gold)] outline-none"
                placeholder="john@luxurydecking.ca"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as Role }))}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--brand-gold)] outline-none"
              >
                <option value={Role.ADMIN}>Admin</option>
                <option value={Role.ESTIMATOR}>Estimator</option>
                <option value={Role.FIELD_EMPLOYEE}>Field Employee</option>
                <option value={Role.SUBCONTRACTOR}>Subcontractor</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-secondary)] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-[var(--brand-gold)] text-white font-bold rounded-xl hover:bg-[var(--brand-gold)] transition-all shadow-lg shadow-[var(--brand-gold)]/20"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand-gold)]/10 flex items-center justify-center border border-[var(--brand-gold)]/20">
                      <span className="text-[var(--brand-gold)] font-bold">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{user.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <select
                      autoFocus
                      value={user.role}
                      onChange={e => handleUpdateRole(user.id, e.target.value as Role)}
                      onBlur={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--brand-gold)]"
                    >
                      <option value={Role.ADMIN}>Admin</option>
                      <option value={Role.ESTIMATOR}>Estimator</option>
                      <option value={Role.FIELD_EMPLOYEE}>Field Employee</option>
                      <option value={Role.SUBCONTRACTOR}>Subcontractor</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === Role.ADMIN ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                        user.role === Role.ESTIMATOR ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        user.role === Role.FIELD_EMPLOYEE ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20' :
                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      <button 
                        onClick={() => setEditingId(user.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-secondary)] rounded transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-[var(--text-secondary)]" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--brand-gold)] font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)] animate-pulse" />
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-amber-700 dark:text-amber-500">Security Notice</h3>
          <p className="text-sm text-amber-600/80 dark:text-amber-500/70 mt-1">
            Role changes take effect immediately. Admins have full access to all data and settings. 
            Field Employees and Subcontractors only see jobs assigned to them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserManagementView;
