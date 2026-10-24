import type { ResolvedVariant } from './data.ts';

const supportedPunctuation: Record<string, string> = {
  '–': '--', '—': '---', '‘': '`', '’': "'", '“': '``', '”': "''", '…': '\\ldots{}', '•': '\\textbullet{}',
};

export function escapeLatex(input: string): string {
  let output = '';
  for (const char of input) {
    if (char === '\r') continue;
    if (char === '\n') { output += '\\\\'; continue; }
    if (supportedPunctuation[char]) { output += supportedPunctuation[char]; continue; }
    if (char.codePointAt(0)! > 255) throw new Error(`Unsupported character “${char}” (U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}) for the current pdfLaTeX font. Replace it with supported text.`);
    const map: Record<string, string> = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '%': '\\%', '#': '\\#', '_': '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };
    output += map[char] ?? char;
  }
  return output;
}

export function safeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return null;
    const serialized = url.href;
    if (/[{}\\\s]/.test(serialized)) return null;
    return serialized;
  } catch { return null; }
}

function link(label: string, rawUrl: string): string {
  const url = safeUrl(rawUrl);
  if (!url) return escapeLatex(label);
  return `\\href{\\detokenize{${url}}}{\\underline{${escapeLatex(label)}}}`;
}

function inlineLinks(links: { label: string; url: string }[]): string {
  return links.map(item => link(item.label, item.url)).join(' \\quad ');
}

export function renderLatex(resume: ResolvedVariant): string {
  const compact = resume.templateId === 't02-clean-compact';
  const modern = resume.templateId === 't03-modern-developer';
  const academic = resume.templateId === 't04-academic-cv';
  const profile = resume.templateId === 't05-profile-cv';
  const sectionRule = academic ? '1.2pt' : '0.45pt';
  const margin = `${resume.design.marginMm}mm`;
  const fs = resume.design.fontSize;
  const baseline = (fs * 1.2).toFixed(2);
  const leading = Math.max(0.9, Math.min(1.5, resume.design.lineSpacing));
  const color = resume.design.accentColor.slice(1).toUpperCase();
  const textColor = resume.design.textColor.slice(1).toUpperCase();
  const p = resume.profile;
  const contacts = [resume.design.showEmail && p.email && link(p.email, `mailto:${p.email}`), resume.design.showPhone && p.phone && escapeLatex(p.phone), ...(resume.design.showLinks ? p.links.map(l => link(l.label, l.url)) : [])].filter(Boolean).join(' \\quad ');
  const entriesById = new Map(resume.entries.map(entry => [entry.id, entry]));
  const body = resume.sections.filter(section => section.visible).map(section => {
    const sectionEntries = section.entryIds.flatMap(id => entriesById.has(id) ? [entriesById.get(id)!] : []);
    if (!sectionEntries.length) return '';
    const rows = sectionEntries.map(entry => {
      if (section.id === 'skills') {
        const skills = entry.description || entry.technologies.map(escapeLatex).join(', ');
        return `\\par\\noindent\\textbf{${escapeLatex(entry.title)}:} ${escapeLatex(skills)}`;
      }
      const heading = [entry.title, entry.subtitle].filter(Boolean).map(escapeLatex).join(' | ');
      const date = entry.date ? (resume.design.dateAlignment === 'right' ? `\\hfill{\\small ${escapeLatex(entry.date)}}` : `\\par{\\small ${escapeLatex(entry.date)}}`) : '';
      const location = entry.location ? `\\par{\\small ${escapeLatex(entry.location)}}` : '';
      const description = entry.description ? `\\par ${escapeLatex(entry.description)}` : '';
      const bullets = entry.bullets.length ? `\\begin{itemize}[leftmargin=1.25em,itemsep=${resume.design.bulletSpacing}pt,topsep=2pt]\n${entry.bullets.map(b => `\\item ${escapeLatex(b)}`).join('\n')}\\end{itemize}` : '';
      const technologies = entry.technologies.length ? `\\par\\textbf{Technologies:} ${entry.technologies.map(escapeLatex).join(', ')}` : '';
      const links = entry.links.length ? `\\par\\smallskip ${inlineLinks(entry.links)}` : '';
      return `\\par\\smallskip\\noindent\\textbf{${heading}}${date}${location}${description}${bullets}${technologies}${links}`;
    }).join('\n');
    return `\\ResumeSection{${escapeLatex(section.label)}}\n${rows}`;
  }).filter(Boolean).join('\n\\medskip\n');
  const name = escapeLatex(p.name || 'Your Name');
  const title = escapeLatex(p.title);
  const location = resume.design.showLocation ? escapeLatex(p.location) : '';
  const headerText = `\\begin{center}{\\LARGE\\bfseries ${name}}\\par${title ? `\\vspace{2pt}{\\large ${title}}\\par` : ''}\\vspace{5pt}\\small ${contacts}${location ? `\\\\${location}` : ''}\\end{center}`;
  const header = profile && p.photoDataUrl
    ? `\\noindent\\begin{minipage}[c]{0.77\\linewidth}\\raggedright{\\LARGE\\bfseries ${name}}\\par${title ? `{\\large ${title}}\\par` : ''}\\vspace{4pt}\\small ${contacts}\\par ${location}\\end{minipage}\\hfill\\begin{minipage}[c]{0.17\\linewidth}\\raggedleft\\includegraphics[width=22mm,height=26mm,keepaspectratio]{profile-photo}\\end{minipage}\\par\\vspace{12pt}`
    : headerText;
  const align = compact ? '\\raggedright' : '';
  return String.raw`\documentclass[10pt,${resume.design.paper === 'a4' ? 'a4paper' : 'letterpaper'}]{article}
\usepackage[margin=${margin}]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern}
\usepackage{microtype}
\usepackage{enumitem}
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{hyperref}
\definecolor{accent}{HTML}{${color}}
\definecolor{bodytext}{HTML}{${textColor}}
\hypersetup{colorlinks=true,urlcolor=accent,linkcolor=accent}
\pagestyle{${resume.design.pageNumbers ? 'plain' : 'empty'}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{${compact ? '1pt' : '2pt'}}
\renewcommand{\baselinestretch}{${leading}}
\newcommand{\ResumeSection}[1]{\par\addvspace{${compact ? '5pt' : academic ? '9pt' : '7pt'}}\noindent{\large\bfseries\color{${modern ? 'accent' : 'bodytext'}} #1}\par\vspace{1pt}\noindent\color{${modern ? 'accent' : 'bodytext'}}\rule{\linewidth}{${sectionRule}}\color{bodytext}\par\vspace{2pt}}
\begin{document}
${resume.design.fontFamily === 'sans' ? '\\renewcommand{\\familydefault}{\\sfdefault}' : ''}
\fontsize{${fs}pt}{${baseline}pt}\selectfont
\color{bodytext}
${align}
${header}
\vspace{${compact ? '3pt' : '8pt'}}
${body}
\end{document}
`;
}
