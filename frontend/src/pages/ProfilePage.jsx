import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Mail, Phone, ShieldCheck, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { Avatar, PageHeader, Pill, fmtDate, fadeIn } from "../components/ui";

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => { api.get("/projects").then((r) => setProjects(r.data.data)).catch(() => {}); }, []);

  const pick = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const upload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("profilePicture", file);
    setUploading(true);
    try {
      const res = await api.put("/user/update-profile-picture", formData, { headers: { "Content-Type": "multipart/form-data" } });
      useAuthStore.setState({ user: { ...user, profilePicture: res.data.user.profilePicture } });
      setFile(null);
      toast.success("Profile picture updated");
    } catch (err) { toast.error(errMsg(err, "Failed to update profile picture")); } finally { setUploading(false); }
  };

  const picture = preview || user?.profilePicture;

  return (
    <motion.div {...fadeIn} className="max-w-3xl">
      <PageHeader title="Profile" />
      <div className="card p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {picture && !picture.includes("default-profile-picture")
              ? <img src={picture} alt={user?.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-canvas" />
              : <Avatar user={user} size="w-24 h-24 text-2xl" />}
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center cursor-pointer hover:bg-canvas" title="Change picture">
              <Camera size={15} className="text-muted" />
              <input type="file" accept="image/*" className="hidden" onChange={pick} />
            </label>
          </div>
          {file && <button className="btn-primary text-xs px-3 py-1.5" onClick={upload} disabled={uploading}>{uploading ? "Uploading…" : "Save picture"}</button>}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">{user?.name}</h2>
            <p className="text-sm text-muted">Member since {fmtDate(user?.createdAt)}</p>
          </div>
          <p className="text-sm text-ink flex items-center gap-2"><Mail size={15} className="text-muted" />{user?.email}</p>
          <p className="text-sm text-ink flex items-center gap-2"><Phone size={15} className="text-muted" />{user?.phone && user?.whatsappVerified ? <>{user.phone} <Pill className="bg-emerald-50 text-emerald-700">WhatsApp verified</Pill></> : <span className="text-muted">No verified WhatsApp number (verify one in Settings)</span>}</p>
          {user?.isVerified && <Pill className="bg-emerald-50 text-emerald-700"><ShieldCheck size={12} />Email verified</Pill>}
        </div>
      </div>

      <div className="card mt-5">
        <p className="px-5 py-3.5 border-b border-line text-sm font-medium text-ink">My projects</p>
        {projects.length === 0 ? <p className="text-sm text-muted px-5 py-6">Not part of any project yet.</p> : projects.map((p) => (
          <div key={p._id} className="flex items-center justify-between px-5 py-3 border-b border-line last:border-0">
            <span className="text-sm text-ink">{p.name}</span>
            {p.isLead ? <span className="text-xs text-accent flex items-center gap-1"><Crown size={13} />Lead</span> : <span className="text-xs text-muted">Member</span>}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProfilePage;
