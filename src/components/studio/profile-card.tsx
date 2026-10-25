'use client';

import { ContactLink, ContactLinkType, Profile } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  ChevronRight,
  Crop,
  Github,
  Globe,
  Linkedin,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';

export interface ProfileCardProps {
  profile: Profile;
  profileOverrides: Partial<Profile>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleOverrides: () => void;
  onEditField: (field: 'name' | 'title' | 'email' | 'phone' | 'location', value: string) => void;
  onEditLinks: (links: ContactLink[]) => void;
  onOpenPhotoModal: () => void;
  onRemovePhoto: () => void;
}

const contactTypes: { id: ContactLinkType; label: string }[] = [
  { id: 'website', label: 'Website' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'github', label: 'GitHub' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'other', label: 'Other' },
];

export function ProfileCard({
  profile,
  profileOverrides,
  isCollapsed,
  onToggleCollapse,
  onToggleOverrides,
  onEditField,
  onEditLinks,
  onOpenPhotoModal,
  onRemovePhoto,
}: ProfileCardProps) {
  const currentPhoto = profileOverrides.photoDataUrl ?? profile.photoDataUrl;
  const currentLinks = profileOverrides.links ?? profile.links;
  const hasOverrides = Object.keys(profileOverrides).length > 0;

  return (
    <Card id="card-profile" className="form-card gap-0">
      <CardHeader className="card-title p-0">
        <div className="card-title-left">
          <span className="step">01</span>
          <CardTitle className="card-heading">Profile & Contact</CardTitle>
        </div>
        <div className="profile-header-actions">
          <Button
            variant="link"
            className="text-button"
            onClick={onToggleOverrides}
          >
            {hasOverrides ? 'Using custom overrides' : 'Using master profile'}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="section-collapse"
            aria-label={isCollapsed ? 'Expand profile' : 'Collapse profile'}
            aria-expanded={!isCollapsed}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          {/* Profile Photo Avatar Row */}
          <div className="wide profile-photo-row">
            <div className="profile-avatar-box">
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPhoto}
                  alt="Profile preview"
                  className="profile-avatar-img"
                />
              ) : (
                <Camera size={22} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Profile Photo (Template 05 / CV)</div>
              <div className="text-xs text-muted-foreground mb-2">
                {currentPhoto
                  ? 'Photo active for photo-enabled templates.'
                  : 'Optional portrait photo for CV.'}
              </div>
              <div className="photo-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="button secondary"
                  onClick={onOpenPhotoModal}
                >
                  <Crop size={13} />
                  <span>{currentPhoto ? 'Edit / Crop Photo' : 'Upload & Crop Photo'}</span>
                </Button>
                {currentPhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={onRemovePhoto}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="field-grid">
            {(['name', 'title', 'email', 'phone', 'location'] as const).map(field => (
              <label key={field} className={field === 'location' ? 'wide' : ''}>
                <span>
                  {field === 'title' ? 'Professional title' : field[0].toUpperCase() + field.slice(1)}
                </span>
                <Input
                  value={profileOverrides[field] ?? profile[field]}
                  onChange={e => onEditField(field, e.target.value)}
                  placeholder={`Add ${field}`}
                />
              </label>
            ))}

            {/* Links */}
            <div className="wide profile-links">
              <span>Contact & Social Links</span>
              {currentLinks.map((link, index) => {
                const Icon =
                  link.type === 'linkedin'
                    ? Linkedin
                    : link.type === 'github'
                    ? Github
                    : link.type === 'portfolio'
                    ? BriefcaseBusiness
                    : link.type === 'other'
                    ? LinkIcon
                    : Globe;
                return (
                  <div className="typed-link-row" key={`${index}-${link.type}-${link.label}`}>
                    <label>
                      <span>Type</span>
                      <NativeSelect
                        size="default"
                        aria-label="Link type"
                        value={link.type}
                        onChange={e => {
                          const links = [...currentLinks];
                          links[index] = { ...links[index], type: e.target.value as ContactLinkType };
                          onEditLinks(links);
                        }}
                      >
                        {contactTypes.map(item => (
                          <NativeSelectOption key={item.id} value={item.id}>
                            {item.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </label>
                    <span className="link-type-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <Input
                      aria-label="Link label"
                      value={link.label}
                      onChange={e => {
                        const links = [...currentLinks];
                        links[index] = { ...links[index], label: e.target.value };
                        onEditLinks(links);
                      }}
                      placeholder="Label (e.g. GitHub)"
                    />
                    <Input
                      aria-label="Link URL"
                      value={link.url}
                      onChange={e => {
                        const links = [...currentLinks];
                        links[index] = { ...links[index], url: e.target.value };
                        onEditLinks(links);
                      }}
                      placeholder="https://github.com/..."
                    />
                    <button
                      type="button"
                      title="Remove link"
                      aria-label="Remove link"
                      onClick={() => onEditLinks(currentLinks.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <Button
                variant="link"
                className="text-button"
                onClick={() =>
                  onEditLinks([...currentLinks, { type: 'website', label: 'Website', url: 'https://' }])
                }
              >
                ＋ Add contact link
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
