import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ListChecks, CalendarClock, ShieldAlert, ArrowRight } from "lucide-react";
import { Logo } from "../components/ui";
import HeroPreview from "../components/HeroPreview";

const CAPABILITIES = [
  { icon: ListChecks, title: "Task visibility", text: "Clear ownership and progress." },
  { icon: CalendarClock, title: "Deadline tracking", text: "Timely reminders and overdue alerts." },
  { icon: ShieldAlert, title: "Early risk detection", text: "Evidence-based insights into potential blockers." },
];

const STEPS = [
  { title: "Plan the work", text: "Create a project, add your team and assign tasks with clear deadlines and expected outcomes." },
  { title: "Teams check in", text: "Members share quick updates, submit their work and flag blockers as they go." },
  { title: "Step in early", text: "TeamPulse compares updates with the records and highlights tasks that may need your support." },
];

const HomePage = () => (
  <div className="min-h-screen bg-canvas">
    <header className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
      <Logo />
      <nav className="flex items-center gap-1 sm:gap-2">
        <a href="#product" className="hidden md:inline-flex btn-ghost">Product</a>
        <a href="#how-it-works" className="hidden md:inline-flex btn-ghost">How it works</a>
        <span className="hidden md:block w-px h-5 bg-line mx-1" aria-hidden />
        <Link to="/login" className="btn-ghost">Log in</Link>
        <Link to="/signup" className="btn-primary">Get started</Link>
      </nav>
    </header>

    <main>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 lg:pt-14 pb-14 lg:pb-16 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="max-w-xl">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-accent mb-4">INTELLIGENT TEAM OPERATIONS</p>
          <h1 className="text-[32px] sm:text-[40px] lg:text-[44px] font-semibold tracking-tight text-ink leading-[1.12] text-balance">
            Know when a project is at risk.
            <span className="block text-muted">Step in <span className="text-accent">before deadlines slip.</span></span>
          </h1>
          <p className="text-base text-muted mt-5 leading-relaxed max-w-lg">
            TeamPulse brings tasks, deadlines, submissions, and team check-ins together to help you spot potential blockers early and keep projects moving.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <Link to="/signup" className="btn-primary px-5 py-2.5">Create your workspace</Link>
            <a href="#product" className="btn-secondary px-5 py-2.5">Explore the product</a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="w-full max-w-xl lg:max-w-none mx-auto">
          <HeroPreview />
        </motion.div>
      </section>

      {/* Capabilities */}
      <section id="product" className="scroll-mt-6 border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid md:grid-cols-3 md:divide-x divide-line">
            {CAPABILITIES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3 py-4 md:py-0 md:px-8 first:md:pl-0 last:md:pr-0 border-t md:border-t-0 border-line first:border-t-0">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0"><Icon size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="text-sm text-muted mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-6 border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-accent mb-2">HOW IT WORKS</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink max-w-lg">From plan to delivery, with fewer surprises.</h2>
          <ol className="grid md:grid-cols-3 gap-8 mt-8">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="text-xs font-semibold text-accent">0{i + 1}</span>
                <p className="text-sm font-semibold text-ink mt-1">{s.title}</p>
                <p className="text-sm text-muted mt-1 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
          <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline mt-10">
            Create your workspace <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>

    <footer className="border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
        <span>© {new Date().getFullYear()} TeamPulse AI</span>
        <span>Dashboard preview above uses sample data.</span>
      </div>
    </footer>
  </div>
);

export default HomePage;
