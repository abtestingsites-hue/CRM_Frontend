import React, { useState } from 'react';
import { X, Edit, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { validatePhoneNumber, validateEmail, validatePersonName } from '@/lib/validation';

interface EditAgentModalProps {
  agent: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAgentModal({ agent, onClose, onSuccess }: EditAgentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Normalize initial status: 'ONLINE' -> 'AVAILABLE'
  const initialStatus = agent.status === 'ONLINE' ? 'AVAILABLE' : (agent.status || 'OFFLINE');

  const [formData, setFormData] = useState({
    name: agent.name || '',
    email: agent.user?.email || '',
    phone: agent.phone || '',
    department: agent.department || '',
    role: agent.user?.role || agent.role || 'AGENT',
    status: initialStatus
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValidationError(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate Name
    const nameVal = validatePersonName(formData.name, 'Full Name');
    if (!nameVal.isValid) {
      setValidationError(nameVal.error || 'Invalid full name');
      return;
    }

    // Validate Email
    const emailVal = validateEmail(formData.email);
    if (!emailVal.isValid) {
      setValidationError(emailVal.error || 'Invalid email address');
      return;
    }

    // Validate Phone (Indian mobile 10 digits if provided)
    if (formData.phone?.trim()) {
      const phoneVal = validatePhoneNumber(formData.phone, '+91');
      if (!phoneVal.isValid) {
        setValidationError(phoneVal.error || 'Invalid phone number');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = { ...formData };
      // Map status 'ONLINE' to 'AVAILABLE'
      if (payload.status === 'ONLINE') payload.status = 'AVAILABLE';

      const res = await apiFetch(`/api/v1/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        setValidationError(err.error || 'Failed to update agent');
        alert(`Error: ${err.error || 'Failed to update agent'}`);
      }
    } catch (err) {
      console.error(err);
      setValidationError('Network error occurred.');
      alert('Network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Edit className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Edit Agent Profile</h2>
              <p className="text-xs text-slate-500">Modify information for {agent.name}</p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 text-xs text-rose-400 flex items-center justify-between">
            <span>{validationError}</span>
            <button onClick={() => setValidationError(null)} className="text-rose-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="edit-agent-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Full Name</label>
              <input aria-label="Name" required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full bg-[#111] border border-[#333] focus:border-blue-500 rounded-lg px-4 py-2 text-sm outline-none text-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Email Address</label>
              <input aria-label="Email" required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full bg-[#111] border border-[#333] focus:border-blue-500 rounded-lg px-4 py-2 text-sm outline-none text-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Phone Number (10 digits)</label>
              <div className="flex gap-2">
                <span className="bg-[#161616] border border-[#333] text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center font-mono">
                  +91
                </span>
                <input aria-label="Phone" name="phone" maxLength={10} value={formData.phone} onChange={handleChange} placeholder="9876543210" type="tel" className="flex-1 bg-[#111] border border-[#333] focus:border-blue-500 rounded-lg px-4 py-2 text-sm outline-none text-white transition-colors font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Role</label>
                <select aria-label="Agent Role" name="role" value={formData.role} onChange={handleChange} className="w-full bg-[#111] border border-[#333] focus:border-blue-500 rounded-lg px-4 py-2 text-sm outline-none text-white transition-colors">
                  <option value="AGENT">Agent</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="SALES_AGENT">Sales Agent</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Status</label>
                <select aria-label="Agent Status" name="status" value={formData.status} onChange={handleChange} className="w-full bg-[#111] border border-[#333] focus:border-blue-500 rounded-lg px-4 py-2 text-sm outline-none text-white transition-colors">
                  <option value="AVAILABLE">Online (Available)</option>
                  <option value="BUSY">Busy</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Department</label>
              <input aria-label="Department" name="department" value={formData.department} onChange={handleChange} type="text" className="w-full bg-[#111] border border-[#333] focus:border-blue-500 rounded-lg px-4 py-2 text-sm outline-none text-white transition-colors" />
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-[#222] bg-[#111] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#333] text-slate-300 rounded-lg text-sm font-medium hover:bg-[#222] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-agent-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-bold shadow-lg shadow-blue-500/20"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
