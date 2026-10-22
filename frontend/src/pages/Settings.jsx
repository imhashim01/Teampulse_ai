import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { PageHeader, fadeIn } from "../components/ui";

const Settings = () => {
  const { user } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone || "");
  const [optIn, setOptIn] = useState(Boolean(user?.whatsappOptIn));
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.patch("/user/settings", { phone: phone.trim(), whatsappOptIn: optIn });
      // Keep the auth store in sync without changing its functions
      useAuthStore.setState({ user: r.data.user });
      setPhone(r.data.user.phone || "");
      toast.success("Settings saved");
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <motion.div {...fadeIn} className="max-w-xl">
      <PageHeader title="Settings" subtitle="Choose how TeamPulse reaches you." />
      <form onSubmit={save} className="card p-6 space-y-5">
        <div>
          <label className="label">WhatsApp phone number</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+923001234567 or 03001234567" />
          </div>
          <p className="text-xs text-muted mt-1.5">Saved in international format (E.164).</p>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-line p-4 cursor-pointer">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-0.5 accent-[#4F46E5]" />
          <span>
            <span className="text-sm font-medium text-ink flex items-center gap-2"><MessageCircle size={15} className="text-[#128C7E]" />Send me WhatsApp notifications</span>
            <span className="block text-xs text-muted mt-1">Task assignments, revision requests, deadline reminders and messages your lead approves. You can turn this off any time.</span>
          </span>
        </label>
        <div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></div>
      </form>
    </motion.div>
  );
};

export default Settings;
