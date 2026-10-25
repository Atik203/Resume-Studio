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

export function formatMarkdownLatex(input: string): string {
  if (!input) return '';
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let result = '';
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      result += escapeLatex(input.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const label = match[1];
      const rawUrl = match[2];
      const validUrl = safeUrl(rawUrl);
      if (validUrl) {
        result += `\\href{\\detokenize{${validUrl}}}{\\underline{${escapeLatex(label)}}}`;
      } else {
        result += escapeLatex(label);
      }
    } else if (match[3] !== undefined) {
      result += `\\textbf{${escapeLatex(match[3])}}`;
    } else if (match[4] !== undefined) {
      result += `\\textit{${escapeLatex(match[4])}}`;
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < input.length) {
    result += escapeLatex(input.slice(lastIndex));
  }

  return result;
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

function linkWithType(item: { type: string; label: string; url: string }, showMarker: boolean): string {
  const marker = ({ website: 'WEB', linkedin: 'IN', github: 'GH', portfolio: 'PORT', other: 'LINK' } as Record<string, string>)[item.type] ?? 'LINK';
  return `${showMarker ? `\\textsf{\\scriptsize [${marker}]}\\,` : ''}${link(item.label, item.url)}`;
}

function inlineLinks(links: { type: string; label: string; url: string }[], showMarkers: boolean): string {
  return links.map(item => linkWithType(item, showMarkers)).join(' \\quad ');
}

export function renderLatex(resume: ResolvedVariant): string {
  const compact = resume.templateId === 't02-clean-compact';
  const modern = resume.templateId === 't03-modern-developer';
  const profile = resume.templateId === 't05-profile-cv';
  const fs = resume.design.fontSize;
  const baseline = (fs * 1.2).toFixed(2);
  const leading = Math.max(0.9, Math.min(1.5, resume.design.lineSpacing));
  const color = resume.design.accentColor.slice(1).toUpperCase();
  const textColor = resume.design.textColor.slice(1).toUpperCase();
  const fontFamily = resume.design.fontFamily;
  const fontPackages: Record<string, string> = {
    serif: 'lmodern', sans: 'lmodern', 'latin-modern-serif': 'lmodern', 'latin-modern-sans': 'lmodern',
    'tex-gyre-termes': 'tgtermes', 'tex-gyre-heros': 'tgheros', 'tex-gyre-pagella': 'tgpagella',
    'tex-gyre-schola': 'tgschola', 'tex-gyre-cursor': 'tgcursor',
  };
  const fontPackage = fontPackages[fontFamily] ?? 'lmodern';
  const fontSwitch = ['sans', 'latin-modern-sans', 'tex-gyre-heros'].includes(fontFamily) ? '\\renewcommand{\\familydefault}{\\sfdefault}'
    : fontFamily === 'tex-gyre-cursor' ? '\\renewcommand{\\familydefault}{\\ttdefault}' : '';
  const p = resume.profile;
  const contacts = [resume.design.showEmail && p.email && link(p.email, `mailto:${p.email}`), resume.design.showPhone && p.phone && escapeLatex(p.phone), ...(resume.design.showLinks ? p.links.map(l => linkWithType(l, resume.design.showContactIcons)) : [])].filter(Boolean).join(' \\quad ');
  const entriesById = new Map(resume.entries.map(entry => [entry.id, entry]));
  const body = resume.sections.filter(section => section.visible).map(section => {
    const sectionEntries = section.entryIds.flatMap(id => entriesById.has(id) ? [entriesById.get(id)!] : []);
    if (!sectionEntries.length) return '';
    const rows = sectionEntries.map(entry => {
      if (section.id === 'skills') {
        const skills = entry.description ? formatMarkdownLatex(entry.description) : entry.technologies.map(escapeLatex).join(', ');
        return `\\par\\noindent\\textbf{${escapeLatex(entry.title)}:} ${skills}`;
      }
      const heading = [entry.title, entry.subtitle].filter(Boolean).map(escapeLatex).join(' | ');
      const date = entry.date ? (resume.design.dateAlignment === 'right' ? `\\hfill{\\small ${escapeLatex(entry.date)}}` : `\\par{\\small ${escapeLatex(entry.date)}}`) : '';
      const location = entry.location ? `\\par{\\small ${escapeLatex(entry.location)}}` : '';
      const description = entry.description ? `\\par ${formatMarkdownLatex(entry.description)}` : '';
      const bullets = entry.bullets.length ? `\\begin{itemize}[leftmargin=${resume.design.bulletIndentMm}mm,itemsep=${resume.design.bulletSpacing}pt,topsep=2pt]\n${entry.bullets.map(b => `\\item ${formatMarkdownLatex(b)}`).join('\n')}\\end{itemize}` : '';
      const technologies = entry.technologies.length ? `\\par\\textbf{Technologies:} ${entry.technologies.map(escapeLatex).join(', ')}` : '';
      const links = entry.links.length ? `\\par\\smallskip ${inlineLinks(entry.links, resume.design.showContactIcons)}` : '';
      return `\\par\\smallskip\\noindent\\textbf{${heading}}${date}${location}${description}${bullets}${technologies}${links}`;
    }).join(`\n\\vspace{${resume.design.entryGapPt}pt}\n`);
    const style = section.design ?? {};
    const sectionSize = style.fontSizePt ?? resume.design.fontSize;
    const sectionBaseline = (sectionSize * 1.2).toFixed(2);
    const marginLeft = style.marginLeftMm ?? 0;
    const marginRight = style.marginRightMm ?? 0;
    const divider = style.showDivider ?? resume.design.showDividers;
    const dividerWeight = divider ? (style.dividerWeightPt ?? resume.design.dividerWeightPt) : 0;
    return `\\par\\vspace{${style.marginTopPt ?? 0}pt}\\begingroup\\setlength{\\leftskip}{${marginLeft}mm}\\setlength{\\rightskip}{${marginRight}mm}\\vspace{${style.paddingTopPt ?? 0}pt}\\fontsize{${sectionSize}pt}{${sectionBaseline}pt}\\selectfont\\ResumeSection{${escapeLatex(section.label)}}{${dividerWeight}pt}{\\dimexpr\\linewidth-${marginLeft}mm-${marginRight}mm\\relax}\n${rows}\\par\\vspace{${style.paddingBottomPt ?? 0}pt}\\endgroup\\par\\vspace{${style.marginBottomPt ?? 0}pt}`;
  }).filter(Boolean).join('\n\\medskip\n');

  const name = escapeLatex(p.name || 'Your Name');
  const title = escapeLatex(p.title);
  const location = resume.design.showLocation ? escapeLatex(p.location) : '';
  const headerLayout = resume.design.headerLayout ?? (compact ? 'left' : 'centered');

  const centeredHeader = `\\begin{center}{\\LARGE\\bfseries ${name}}\\par${title ? `\\vspace{2pt}{\\large ${title}}\\par` : ''}\\vspace{5pt}\\small ${contacts}${location ? `\\\\${location}` : ''}\\end{center}`;
  const leftHeader = `\\noindent{\\LARGE\\bfseries ${name}}\\par${title ? `\\vspace{2pt}{\\large\\color{${modern ? 'accent' : 'bodytext'}} ${title}}\\par` : ''}\\vspace{4pt}{\\small ${contacts}${location ? ` \\quad ${location}` : ''}}\\par`;
  const splitHeader = `\\noindent\\begin{minipage}[b]{0.58\\linewidth}\\raggedright{\\LARGE\\bfseries ${name}}\\par${title ? `\\vspace{2pt}{\\large ${title}}` : ''}\\end{minipage}\\hfill\\begin{minipage}[b]{0.40\\linewidth}\\raggedleft\\small ${contacts}${location ? `\\par ${location}` : ''}\\end{minipage}\\par`;

  const defaultHeader = headerLayout === 'left' ? leftHeader : headerLayout === 'split' ? splitHeader : centeredHeader;
  const header = profile && p.photoDataUrl
    ? `\\noindent\\begin{minipage}[c]{0.77\\linewidth}\\raggedright{\\LARGE\\bfseries ${name}}\\par${title ? `{\\large ${title}}\\par` : ''}\\vspace{4pt}\\small ${contacts}\\par ${location}\\end{minipage}\\hfill\\begin{minipage}[c]{0.17\\linewidth}\\raggedleft\\includegraphics[width=22mm,height=26mm,keepaspectratio]{profile-photo}\\end{minipage}\\par\\vspace{12pt}`
    : defaultHeader;

  const dividerStyle = resume.design.dividerStyle ?? 'solid';
  const dividerColor = dividerStyle === 'accent' || modern ? 'accent' : 'bodytext';
  const ruleMacro = dividerStyle === 'none'
    ? ''
    : dividerStyle === 'dotted'
      ? `\\color{${dividerColor}}\\makebox[#3]{\\dotfill}\\color{bodytext}`
      : `\\color{${dividerColor}}\\rule{#3}{#2}\\color{bodytext}`;

  const align = compact && headerLayout !== 'centered' ? '\\raggedright' : '';
  return String.raw`\documentclass[10pt,${resume.design.paper === 'a4' ? 'a4paper' : 'letterpaper'}]{article}
\usepackage[top=${resume.design.marginTopMm}mm,right=${resume.design.marginRightMm}mm,bottom=${resume.design.marginBottomMm}mm,left=${resume.design.marginLeftMm}mm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{${fontPackage}}
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
\newcommand{\ResumeSection}[3]{\par\addvspace{${resume.design.sectionGapPt}pt}\noindent{\large\bfseries\color{${modern ? 'accent' : 'bodytext'}} #1}\par\vspace{1pt}\noindent${ruleMacro}\par\vspace{2pt}}
\begin{document}
${fontSwitch}
\fontsize{${fs}pt}{${baseline}pt}\selectfont
\color{bodytext}
${align}
${header}
\vspace{${compact ? '3pt' : '8pt'}}
${body}
\end{document}
`;
}
