import React from "react";
import { X } from "lucide-react";
import { Lead, LeadStatus } from "../../shared/types";

// --- ADD LEAD MODAL ---
interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    name: string;
    email: string;
    phone: string;
    value: string;
    status: LeadStatus;
    notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      phone: string;
      value: string;
      status: LeadStatus;
      notes: string;
    }>
  >;
}

export function AddLeadModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
}: AddLeadModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-8 rounded-md w-full max-w-[450px] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Register New Opportunity
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Contact / Company Name
            </label>
            <input
              type="text"
              placeholder="Acme Corporation"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                Valuation ($)
              </label>
              <input
                type="number"
                placeholder="15000"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as LeadStatus })
                }
                className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              placeholder="contact@acme.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+1555019000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Notes / Summary
            </label>
            <textarea
              placeholder="Details of user proposal follow-up..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 text-white font-bold py-2.5 rounded-md text-xs cursor-pointer shadow-md mt-2 transition-all"
          >
            Save Contact
          </button>
        </form>
      </div>
    </div>
  );
}

// --- EDIT LEAD MODAL ---
interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    id: string;
    name: string;
    email: string;
    phone: string;
    value: string;
    status: LeadStatus;
    notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      id: string;
      name: string;
      email: string;
      phone: string;
      value: string;
      status: LeadStatus;
      notes: string;
    }>
  >;
}

export function EditLeadModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
}: EditLeadModalProps) {
  if (!isOpen || !form.id) return null;
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-8 rounded-md w-full max-w-[450px] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Edit Opportunity Details
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Contact / Company Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                Valuation ($)
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as LeadStatus })
                }
                className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              Notes / Summary
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 text-white font-bold py-2.5 rounded-md text-xs cursor-pointer shadow-md mt-2 transition-all"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
