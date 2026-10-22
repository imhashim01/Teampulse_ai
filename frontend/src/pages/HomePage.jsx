import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Radar, ClipboardCheck, BellRing, MessageCircle } from "lucide-react";
import { Logo } from "../components/ui";

const FEATURES = [
  { icon: Radar, title: "Ji Sir Detector", text: "Compares what people report with what the records show, and flags hidden blockers early." },
  { icon: ClipboardCheck, title: "Tasks with real review", text: "Submit, review, approve or request revisions. Nothing jumps straight to done." },
  { icon: MessageCircle, title: "Supportive nudges", text: "Friendly Roman Urdu / English messages the lead approves before anything is sent." },
  { icon: BellRing, title: "WhatsApp reminders", text: "Deadline and overdue reminders on WhatsApp, without duplicates." },
];

const HomePage = () => (
  <div className="min-h-screen bg-canvas">
    <header className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-5">
      <Logo />
      <div className="flex items-center gap-2">
        <Link to="/login" className="btn-ghost">Log in</Link>
        <Link to="/signup" className="btn-primary">Get started</Link>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-4 sm:px-6">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="pt-12 sm:pt-20 pb-14 max-w-2xl">
        <p className="text-xs font-medium text-accent bg-accent-soft inline-block rounded-full px-3 py-1 mb-5">For small software teams in Pakistan</p>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-ink leading-tight">
          “Ji sir, ho jayega.”<br />
          <span className="text-muted">Now you will know if it actually will.</span>
        </h1>
        <p className="text-base text-muted mt-5 leading-relaxed">
          TeamPulse AI tracks projects, tasks and check-ins, then quietly compares what people say with what the records show,
          so a lead can offer help before a deadline slips. Support, not surveillance.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link to="/signup" className="btn-primary px-5 py-2.5">Create your team</Link>
          <Link to="/login" className="btn-secondary px-5 py-2.5">Try the demo</Link>
        </div>
      </motion.section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5">
            <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center mb-3"><Icon size={18} /></div>
            <p className="font-medium text-ink">{title}</p>
            <p className="text-sm text-muted mt-1 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </main>
  </div>
);

export default HomePage;
