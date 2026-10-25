'use client';

import {
  DividerStyle,
  FontFamily,
  HeaderLayout,
  ResumeVariant,
  TemplateId,
} from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { designPresets, getDesignPreset, type DesignPresetId } from '@/lib/design-presets';

export interface DesignTabProps {
  active: ResumeVariant;
  designMode: 'quick' | 'advanced';
  onChangeDesignMode: (mode: 'quick' | 'advanced') => void;
  onUpdateVariant: (updater: (v: ResumeVariant) => ResumeVariant) => void;
}

const templates: { id: TemplateId; name: string; description: string }[] = [
  { id: 't01-simple-ats', name: 'Simple ATS', description: 'Centered header · compact sections · 1-page ready' },
  { id: 't02-clean-compact', name: 'Clean Compact', description: 'Left-aligned single column · dense layout' },
  { id: 't03-modern-developer', name: 'Modern Developer', description: 'Restrained accent color · technical hierarchy' },
  { id: 't04-academic-cv', name: 'Academic CV', description: 'Two pages target · roomy academic rhythm' },
  { id: 't05-profile-cv', name: 'Profile CV', description: 'Clean single column with optional portrait' },
];

const COLOR_SWATCHES = [
  { name: 'Forest Emerald', hex: '#1b6342' },
  { name: 'Classic Navy', hex: '#1e3a8a' },
  { name: 'Slate Executive', hex: '#1e293b' },
  { name: 'Academic Crimson', hex: '#7f1d1d' },
  { name: 'Developer Teal', hex: '#315b78' },
  { name: 'Monochrome ATS', hex: '#171717' },
];

export function DesignTab({
  active,
  designMode,
  onChangeDesignMode,
  onUpdateVariant,
}: DesignTabProps) {
  return (
    <div className={`editor-content design-content ${designMode}`}>
      <div className="design-mode-tabs" role="tablist" aria-label="Design controls">
        <button
          role="tab"
          aria-selected={designMode === 'quick'}
          className={designMode === 'quick' ? 'active' : ''}
          onClick={() => onChangeDesignMode('quick')}
        >
          Quick Settings
        </button>
        <button
          role="tab"
          aria-selected={designMode === 'advanced'}
          className={designMode === 'advanced' ? 'active' : ''}
          onClick={() => onChangeDesignMode('advanced')}
        >
          Advanced Spacing
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            onUpdateVariant(v => ({
              ...v,
              design: getDesignPreset(
                v.templateId === 't04-academic-cv'
                  ? 'academic'
                  : v.templateId === 't02-clean-compact'
                  ? 'compact'
                  : v.templateId === 't03-modern-developer'
                  ? 'developer-accent'
                  : 'classic-ats',
                v.templateId,
                v.mode
              ),
            }))
          }
        >
          Reset to Template Default
        </button>
      </div>

      {/* Design Presets */}
      <div className="preset-grid">
        {designPresets.map(preset => (
          <button
            type="button"
            className="preset-button"
            key={preset.id}
            onClick={() =>
              onUpdateVariant(v => ({
                ...v,
                design: getDesignPreset(preset.id as DesignPresetId, v.templateId, v.mode),
              }))
            }
          >
            <strong>{preset.label}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <Card className="form-card gap-0">
        <CardHeader className="card-title p-0">
          <div className="card-title-left">
            <span className="step">01</span>
            <CardTitle className="card-heading">Template Layout</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="template-grid">
            {templates.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdateVariant(v => ({ ...v, templateId: item.id }))}
                className={`template-card ${item.id === active.templateId ? 'chosen' : ''}`}
              >
                <span className="mini-page" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography & Page Settings */}
      <Card className="form-card gap-0">
        <CardHeader className="card-title p-0">
          <div className="card-title-left">
            <span className="step">02</span>
            <CardTitle className="card-heading">Page & Typography</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="field-grid">
            <label>
              <span>Document Type</span>
              <NativeSelect
                value={active.mode}
                onChange={e =>
                  onUpdateVariant(v => {
                    const mode = e.target.value as 'resume' | 'cv';
                    return {
                      ...v,
                      mode,
                      targetPages: mode === 'cv' ? 2 : 1,
                      maxPages: mode === 'cv' ? 3 : 1,
                    };
                  })
                }
              >
                <NativeSelectOption value="resume">Resume · 1 page default</NativeSelectOption>
                <NativeSelectOption value="cv">CV · 2 pages target</NativeSelectOption>
              </NativeSelect>
            </label>

            <label>
              <span>Paper Size</span>
              <NativeSelect
                value={active.design.paper}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: { ...v.design, paper: e.target.value as 'a4' | 'letter' },
                  }))
                }
              >
                <NativeSelectOption value="a4">A4 (Standard International)</NativeSelectOption>
                <NativeSelectOption value="letter">US Letter</NativeSelectOption>
              </NativeSelect>
            </label>

            <label>
              <span>Header Layout</span>
              <NativeSelect
                value={active.design.headerLayout ?? 'centered'}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      headerLayout: e.target.value as HeaderLayout,
                    },
                  }))
                }
              >
                <NativeSelectOption value="centered">Centered Minimalist (FlowCV)</NativeSelectOption>
                <NativeSelectOption value="left">Modern Left-Aligned</NativeSelectOption>
                <NativeSelectOption value="split">Split Two-Column Header</NativeSelectOption>
              </NativeSelect>
            </label>

            <label>
              <span>Font Family</span>
              <NativeSelect
                value={active.design.fontFamily}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: { ...v.design, fontFamily: e.target.value as FontFamily },
                  }))
                }
              >
                <NativeSelectOption value="latin-modern-serif">
                  Latin Modern · Serif (Clean ATS)
                </NativeSelectOption>
                <NativeSelectOption value="latin-modern-sans">
                  Latin Modern · Sans
                </NativeSelectOption>
                <NativeSelectOption value="tex-gyre-termes">
                  TeX Gyre Termes · Times Roman
                </NativeSelectOption>
                <NativeSelectOption value="tex-gyre-heros">
                  TeX Gyre Heros · Helvetica / Arial
                </NativeSelectOption>
                <NativeSelectOption value="tex-gyre-pagella">
                  TeX Gyre Pagella · Palatino
                </NativeSelectOption>
                <NativeSelectOption value="tex-gyre-schola">
                  TeX Gyre Schola · Schoolbook
                </NativeSelectOption>
                <NativeSelectOption value="tex-gyre-cursor">
                  TeX Gyre Cursor · Monospace
                </NativeSelectOption>
              </NativeSelect>
            </label>

            <label>
              <span>Font Size · 8–14 pt</span>
              <Input
                type="number"
                min={8}
                max={14}
                step={0.5}
                value={active.design.fontSize}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      fontSize: Math.max(8, Math.min(14, Number(e.target.value) || 10)),
                    },
                  }))
                }
              />
            </label>

            {(
              [
                ['marginTopMm', 'Top margin · mm'],
                ['marginRightMm', 'Right margin · mm'],
                ['marginBottomMm', 'Bottom margin · mm'],
                ['marginLeftMm', 'Left margin · mm'],
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                <span>{label}</span>
                <Input
                  type="number"
                  min={8}
                  max={40}
                  value={active.design[field]}
                  onChange={e =>
                    onUpdateVariant(v => ({
                      ...v,
                      design: {
                        ...v.design,
                        [field]: Math.max(8, Math.min(40, Number(e.target.value) || 18)),
                      },
                    }))
                  }
                />
              </label>
            ))}

            <label className="wide">
              <span>Accent Color & Curated Palettes</span>
              <div className="flex items-center gap-3">
                <Input
                  className="color-input w-16"
                  type="color"
                  value={active.design.accentColor}
                  onChange={e =>
                    onUpdateVariant(v => ({
                      ...v,
                      design: { ...v.design, accentColor: e.target.value },
                    }))
                  }
                />
                <div className="color-swatches">
                  {COLOR_SWATCHES.map(swatch => (
                    <button
                      key={swatch.hex}
                      type="button"
                      className={`color-swatch-btn ${
                        active.design.accentColor.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'active'
                          : ''
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={`${swatch.name} (${swatch.hex})`}
                      aria-label={swatch.name}
                      onClick={() =>
                        onUpdateVariant(v => ({
                          ...v,
                          design: { ...v.design, accentColor: swatch.hex },
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </label>

            <label className="advanced-only">
              <span>Text Color</span>
              <Input
                className="color-input"
                type="color"
                value={active.design.textColor}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: { ...v.design, textColor: e.target.value },
                  }))
                }
              />
            </label>

            <label className="advanced-only">
              <span>Line Spacing</span>
              <Input
                type="number"
                min={0.9}
                max={1.5}
                step={0.05}
                value={active.design.lineSpacing}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      lineSpacing: Math.max(0.9, Math.min(1.5, Number(e.target.value) || 1)),
                    },
                  }))
                }
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Layout & Contact Toggles */}
      <Card className="form-card gap-0 advanced-card">
        <CardHeader className="card-title p-0">
          <div className="card-title-left">
            <span className="step">03</span>
            <CardTitle className="card-heading">Layout & Contact Visibility</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="field-grid">
            <label>
              <span>Date Alignment</span>
              <NativeSelect
                value={active.design.dateAlignment}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      dateAlignment: e.target.value as 'right' | 'below',
                    },
                  }))
                }
              >
                <NativeSelectOption value="right">Align to the right</NativeSelectOption>
                <NativeSelectOption value="below">Place on a new line</NativeSelectOption>
              </NativeSelect>
            </label>

            <label>
              <span>Bullet Spacing · 0–8 pt</span>
              <Input
                type="number"
                min={0}
                max={8}
                step={0.5}
                value={active.design.bulletSpacing}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      bulletSpacing: Math.max(0, Math.min(8, Number(e.target.value) || 0)),
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Section Spacing · pt</span>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={active.design.sectionGapPt}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      sectionGapPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Entry Spacing · pt</span>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={active.design.entryGapPt}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      entryGapPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Bullet Indent · mm</span>
              <Input
                type="number"
                min={2}
                max={16}
                step={0.2}
                value={active.design.bulletIndentMm}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      bulletIndentMm: Math.max(2, Math.min(16, Number(e.target.value) || 4.4)),
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Divider Weight · pt</span>
              <Input
                type="number"
                min={0.1}
                max={3}
                step={0.1}
                value={active.design.dividerWeightPt}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      dividerWeightPt: Math.max(0.1, Math.min(3, Number(e.target.value) || 0.45)),
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Divider Style</span>
              <NativeSelect
                value={active.design.dividerStyle ?? 'solid'}
                onChange={e =>
                  onUpdateVariant(v => ({
                    ...v,
                    design: {
                      ...v.design,
                      dividerStyle: e.target.value as DividerStyle,
                    },
                  }))
                }
              >
                <NativeSelectOption value="solid">Solid Body Color</NativeSelectOption>
                <NativeSelectOption value="accent">Accent Tinted Line</NativeSelectOption>
                <NativeSelectOption value="dotted">Dotted Accent Rule</NativeSelectOption>
                <NativeSelectOption value="none">None (Whitespace & Weight)</NativeSelectOption>
              </NativeSelect>
            </label>

            {(
              [
                ['showEmail', 'Show Email'],
                ['showPhone', 'Show Phone'],
                ['showLocation', 'Show Location'],
                ['showLinks', 'Show Links'],
                ['pageNumbers', 'Page Numbers'],
                ['showDividers', 'Section Divider Lines'],
                ['showContactIcons', 'Contact Icons'],
              ] as const
            ).map(([field, label]) => (
              <label className="setting-toggle" key={field}>
                <span>{label}</span>
                <Switch
                  checked={active.design[field]}
                  onCheckedChange={checked =>
                    onUpdateVariant(v => ({
                      ...v,
                      design: { ...v.design, [field]: checked },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
