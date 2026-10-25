'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Download,
  Code2,
  CheckCircle2,
  Sliders,
  Clock,
  ChevronRight,
} from 'lucide-react';

const TEMPLATES = [
  {
    id: 't01-simple-ats',
    name: 'Simple ATS',
    tag: 'Primary FlowCV Style',
    desc: 'Restrained, razor-sharp monochrome layout engineered for maximum ATS parser pass-rates.',
    badge: 'Popular',
    accent: '#18181b',
  },
  {
    id: 't02-clean-compact',
    name: 'Clean Compact',
    tag: 'Dense Single-Column',
    desc: 'Tightly proportioned typographic hierarchy designed to fit exhaustive engineering experience into 1 page.',
    badge: 'High Density',
    accent: '#2563eb',
  },
  {
    id: 't03-modern-developer',
    name: 'Modern Developer',
    tag: 'Accented Technical',
    desc: 'Subtle emerald accent lines and strong project/tech-stack hierarchy for modern software engineers.',
    badge: 'Recommended',
    accent: '#10b981',
  },
  {
    id: 't04-academic-cv',
    name: 'Academic CV',
    tag: 'Multi-Page Classical',
    desc: 'Text-first serif layout formatted for comprehensive 2 to 3-page research, teaching, and publication CVs.',
    badge: '2-3 Pages',
    accent: '#7c3aed',
  },
  {
    id: 't05-profile-cv',
    name: 'Profile CV',
    tag: 'Portrait Executive',
    desc: 'Sophisticated header architecture with optional high-resolution portrait avatar and balanced spacing.',
    badge: 'Executive',
    accent: '#e11d48',
  },
];

const FEATURES = [
  {
    icon: <ShieldCheck className="text-emerald-500" size={24} />,
    title: '100% Local-First & Private',
    desc: 'Your resume data never leaves your computer. Stored durably in IndexedDB with zero cloud databases, accounts, or telemetry.',
  },
  {
    icon: <Cpu className="text-sky-500" size={24} />,
    title: 'Native TeX Live pdflatex',
    desc: 'Compiled directly by your local TeX Live engine. Enjoy mathematical micro-typography, ligatures, and guaranteed selectable text.',
  },
  {
    icon: <Sparkles className="text-amber-500" size={24} />,
    title: 'On-Device Qwen 3.5 4B AI',
    desc: 'Private, GPU-accelerated bullet polishing and Google XYZ scoring via local Ollama. Zero API bills, zero data exposure.',
  },
  {
    icon: <Sliders className="text-purple-500" size={24} />,
    title: 'One-Click Page-Fit Assistant',
    desc: 'Say goodbye to accidental second-page spills. Mathematically micro-tunes typography and padding with zero silent text loss.',
  },
  {
    icon: <Code2 className="text-indigo-500" size={24} />,
    title: 'Deep LaTeX Developer Tools',
    desc: 'Live LaTeX source inspector, real-time template diff viewer, and 1-click standalone .zip exports ready for Overleaf.',
  },
  {
    icon: <Clock className="text-rose-500" size={24} />,
    title: 'Snapshot Time Machine',
    desc: 'Create named local checkpoints of your drafts. Roll back or branch variants anytime without corrupting master records.',
  },
];

export function LandingPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('t01-simple-ats');

  return (
    <div className="landing-root min-h-screen bg-[#fafafc] text-neutral-900 selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP STICKY HEADER */}
      <header className="landing-header sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-neutral-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileText size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-neutral-900 flex items-center gap-1.5">
                Resume Studio
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Local-First
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">FlowCV-Inspired LaTeX Editor</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">
              Features
            </a>
            <a href="#templates" className="hover:text-emerald-600 transition-colors">
              Templates
            </a>
            <a href="#privacy" className="hover:text-emerald-600 transition-colors">
              Privacy & TeX Live
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <span>Launch Studio</span>
              <Sparkles size={15} className="text-emerald-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-emerald-100/50 via-teal-50/20 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 shadow-xs animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Private · Zero Subscriptions · Native pdflatex Engine
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 leading-[1.12]">
              Craft job-winning resumes with{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 bg-clip-text text-transparent">
                LaTeX perfection.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-2xl mx-auto font-normal">
              The fluid, modern editing experience of FlowCV paired with the unmatched typesetting precision of your
              local TeX Live compiler. Zero cloud keys, zero telemetry, zero text loss.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/editor"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]"
              >
                <span>Open Resume Editor</span>
                <ArrowRight size={18} />
              </Link>
              <a
                href="#templates"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-base border border-neutral-300 shadow-xs hover:border-neutral-400 transition-all"
              >
                <span>Browse 5 LaTeX Templates</span>
              </a>
            </div>

            {/* Micro proof badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                TeX Live 2024 / 2025
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                On-Device Qwen 3.5 4B (GPU)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                Durable IndexedDB v2
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                ISO 19005-1 PDF/A
              </span>
            </div>
          </div>

          {/* Interactive Workspace Mockup Preview */}
          <div className="relative mx-auto max-w-5xl rounded-2xl p-2 sm:p-3 bg-neutral-200/60 border border-neutral-300/80 shadow-2xl shadow-neutral-900/10">
            <div className="bg-white rounded-xl overflow-hidden border border-neutral-200/80 shadow-inner">
              {/* Fake Window Header */}
              <div className="h-10 bg-neutral-100/90 border-b border-neutral-200 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="text-xs font-semibold text-neutral-500 flex items-center gap-2">
                  <span>Resume Studio — Software Engineer Resume (1 Page Target)</span>
                </div>
                <div className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Verified PDF
                </div>
              </div>

              {/* 2-Column Interface Preview */}
              <div className="grid grid-cols-1 md:grid-cols-[46%_54%] min-h-[460px] bg-neutral-50">
                {/* Left: Editor Mockup */}
                <div className="p-4 sm:p-6 border-r border-neutral-200 flex flex-col gap-4 bg-white">
                  {/* Top Navigation Pill Group */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="inline-flex p-1 bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-600 gap-1">
                      <span className="px-2.5 py-1 rounded-md bg-white text-neutral-900 shadow-xs font-bold">
                        📄 Content
                      </span>
                      <span className="px-2.5 py-1 rounded-md hover:text-neutral-900 cursor-pointer">🎨 Customize</span>
                      <span className="px-2.5 py-1 rounded-md hover:text-neutral-900 cursor-pointer">✨ AI Tools</span>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium">Saved locally</span>
                  </div>

                  {/* FlowCV Style Executive Profile Card */}
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex items-start justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-base text-neutral-900">Md.Atikur Rahaman</div>
                      <div className="text-xs text-emerald-600 font-semibold mb-2">Full Stack Developer</div>
                      <div className="flex flex-col gap-1 text-[11px] text-neutral-500">
                        <span>✉ hello@example.test</span>
                        <span>📞 +1 555 0100 · 📍 Remote</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-neutral-200 border border-neutral-300 flex items-center justify-center text-xs text-neutral-400 font-semibold">
                      Photo
                    </div>
                  </div>

                  {/* FlowCV Style Content Section Card */}
                  <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                      <span className="flex items-center gap-1.5">💼 Work Experience</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Drag to reorder</span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-neutral-900">Senior Full-Stack Engineer · Acme Labs</div>
                        <div className="text-[11px] text-neutral-500">2023 – Present · Next.js, TypeScript, Go</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        XYZ 92%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-neutral-900">Software Engineer · OpenData Corp</div>
                        <div className="text-[11px] text-neutral-500">2021 – 2023 · React, Python, PostgreSQL</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        XYZ 88%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: PDF Preview Mockup */}
                <div className="p-6 bg-neutral-200/40 flex flex-col items-center justify-center relative">
                  {/* Floating Paper */}
                  <div className="w-[84%] aspect-[1/1.414] bg-white rounded-md shadow-xl border border-neutral-300/80 p-6 flex flex-col gap-3 font-serif text-[9px] leading-relaxed text-neutral-800 select-none">
                    <div className="text-center pb-2 border-b border-neutral-300">
                      <div className="font-bold text-sm tracking-wide text-neutral-900 uppercase">Md.Atikur Rahaman</div>
                      <div className="text-[8px] text-neutral-600 italic">Full Stack Developer</div>
                      <div className="text-[7px] text-neutral-500 mt-0.5">hello@example.test · +1 555 0100 · Remote · portfolio.test</div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-[8px] text-emerald-800 tracking-wider pb-0.5 border-b border-emerald-800/40 mb-1">
                        Technical Skills
                      </div>
                      <div className="text-[7.5px]">
                        <strong>Languages:</strong> TypeScript, JavaScript, Python, Go, SQL<br />
                        <strong>Frameworks:</strong> React, Next.js, Node.js, Express, TailwindCSS
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-[8px] text-emerald-800 tracking-wider pb-0.5 border-b border-emerald-800/40 mb-1">
                        Professional Experience
                      </div>
                      <div className="flex justify-between font-bold text-[8px]">
                        <span>Senior Full-Stack Engineer — Acme Labs</span>
                        <span>2023 – Present</span>
                      </div>
                      <ul className="list-disc list-inside text-[7.5px] text-neutral-700 space-y-0.5 mt-0.5">
                        <li>Architected high-throughput microservices reducing latency by 45% using Go and Redis.</li>
                        <li>Spearheaded accessible design system adoption across 14 enterprise frontend surfaces.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Floating Action Badge */}
                  <div className="absolute bottom-4 right-4 bg-neutral-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
                    <Download size={13} />
                    <span>Download PDF (Ctrl+S)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VALUE PROPOSITION PILLARS */}
      <section id="features" className="py-20 bg-white border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Why engineers choose Resume Studio
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-600">
              Unlike cloud SaaS resume builders that hold your data hostage behind monthly paywalls, Resume Studio is
              a self-contained local developer utility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-lg transition-all flex flex-col gap-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{f.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TEMPLATE GALLERY SHOWCASE */}
      <section id="templates" className="py-20 bg-[#fafafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold mb-3">
              5 Dedicated LaTeX Templates
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Built for every stage of your engineering career
            </h2>
            <p className="mt-3 text-base text-neutral-600">
              Single-page software engineering resumes, compact technical profiles, or multi-page academic CVs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((tmpl) => {
              const active = selectedTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-6 rounded-2xl border bg-white cursor-pointer transition-all flex flex-col justify-between ${
                    active
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                      : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {tmpl.tag}
                      </span>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: tmpl.accent }}
                      >
                        {tmpl.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-neutral-900 mb-2">{tmpl.name}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed mb-6">{tmpl.desc}</p>
                  </div>

                  <Link
                    href="/editor"
                    className="inline-flex items-center justify-between pt-4 border-t border-neutral-100 text-sm font-bold text-neutral-800 hover:text-emerald-600 transition-colors"
                  >
                    <span>Use this template</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. PRIVACY & LOCAL ARCHITECTURE */}
      <section id="privacy" className="py-20 bg-neutral-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-500/30">
                100% Offline Integrity
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                No telemetry. No accounts. Complete offline ownership.
              </h2>
              <p className="mt-4 text-neutral-400 text-base leading-relaxed">
                Most web builders analyze your career history, sell recruitment data, or lock PDF exports behind recurring
                subscriptions. Resume Studio compiles through your machine&apos;s native TeX Live pdflatex runtime and runs
                Ollama Qwen 3.5 4B locally on your GPU.
              </p>

              <div className="mt-8 flex flex-col gap-4 text-sm text-neutral-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Remote Compilation:</strong> Compiles via child process execution on <code>127.0.0.1</code>.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Standalone LaTeX Portability:</strong> Export clean ZIP packages that compile identically on TeX Live, MiKTeX, MacTeX, or Overleaf.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Non-Destructive AI:</strong> Qwen 3.5 4B suggests variations; you approve every single edit.
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-950 p-6 sm:p-8 rounded-2xl border border-neutral-800 font-mono text-xs text-neutral-300 shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-[11px] text-neutral-500">
                <span>TERMINAL — LOCAL PDFLATEX VERIFICATION</span>
                <span className="text-emerald-400">● 127.0.0.1</span>
              </div>
              <div className="space-y-1.5 text-neutral-400">
                <p className="text-emerald-400">$ pdflatex -interaction=nonstopmode main.tex</p>
                <p>This is pdfTeX, Version 3.141592653-2.6-1.40.26 (TeX Live 2024)</p>
                <p>entering extended mode (main.tex)</p>
                <p>[1 &lt;assets/profile.png&gt;] (./main.aux)</p>
                <p className="text-emerald-400 font-bold">Output written on main.pdf (1 page, 38,412 bytes).</p>
                <p className="text-sky-400">PDF/A-1b archival metadata confirmed.</p>
                <p className="text-neutral-500">Transcript written on main.log.</p>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Local inference: qwen3.5:4b (GPU)</span>
                <span className="text-emerald-400 font-bold">2.8s · 73 tok/s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOOTER BANNER */}
      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Ready to build your LaTeX resume?
          </h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
            Experience the speed and fluid elegance of FlowCV with the typesetting power of TeX Live.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]"
            >
              <span>Launch Studio for Free</span>
              <Sparkles size={18} className="text-emerald-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. MINIMALIST FOOTER */}
      <footer className="py-8 bg-neutral-50 text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            <span className="font-bold text-neutral-800">Resume Studio</span>
            <span>— Personal Local-First Resume & CV Editor</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/editor" className="hover:text-neutral-900 transition-colors">
              Open Editor
            </Link>
            <a href="#templates" className="hover:text-neutral-900 transition-colors">
              Templates
            </a>
            <a href="#features" className="hover:text-neutral-900 transition-colors">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
