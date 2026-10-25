'use client';

import { useState } from 'react';
import { ContactLink, ContactLinkType, Profile } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  BriefcaseBusiness,
  Camera,
  Crop,
  Github,
  Globe,
  Linkedin,
  Link as LinkIcon,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  Check,
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
  onToggleOverrides,
  onEditField,
  onEditLinks,
  onOpenPhotoModal,
  onRemovePhoto,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const currentPhoto = profileOverrides.photoDataUrl ?? profile.photoDataUrl;
  const currentLinks = profileOverrides.links ?? profile.links;
  const hasOverrides = Object.keys(profileOverrides).length > 0;

  const name = profileOverrides.name ?? profile.name;
  const title = profileOverrides.title ?? profile.title;
  const email = profileOverrides.email ?? profile.email;
  const phone = profileOverrides.phone ?? profile.phone;
  const location = profileOverrides.location ?? profile.location;

  return (
    <Card id="card-profile" className="flowcv-card profile-executive-card overflow-hidden transition-all">
      {/* 1. EXECUTIVE SUMMARY VIEW (FlowCV Style) */}
      {!isEditing ? (
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4 group">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                01 · Profile
              </span>
              {hasOverrides && (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Custom Overrides
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight truncate">
              {name || 'Your Full Name'}
            </h2>
            <div className="text-sm font-semibold text-emerald-600 mb-3">
              {title || 'Professional Title'}
            </div>

            {/* Contact Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              {email && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200/60 font-medium">
                  <Mail size={12} className="text-neutral-500" />
                  <span className="truncate max-w-[180px]">{email}</span>
                </span>
              )}
              {phone && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200/60 font-medium">
                  <Phone size={12} className="text-neutral-500" />
                  <span>{phone}</span>
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200/60 font-medium">
                  <MapPin size={12} className="text-neutral-500" />
                  <span>{location}</span>
                </span>
              )}
              {currentLinks.map((link, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200/60 font-medium"
                >
                  <LinkIcon size={12} className="text-neutral-500" />
                  <span>{link.label || link.type}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right Action & Avatar Box */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-neutral-300 hover:border-emerald-500 hover:text-emerald-600 text-xs font-bold transition-all shadow-xs"
            >
              <Pencil size={13} />
              <span>Edit Details</span>
            </Button>

            {/* Avatar preview */}
            <div
              onClick={onOpenPhotoModal}
              title="Click to edit or upload portrait photo"
              className="w-14 h-14 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-emerald-500 bg-neutral-50 hover:bg-emerald-50/30 flex items-center justify-center cursor-pointer overflow-hidden transition-all shadow-inner group/avatar"
            >
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPhoto} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-neutral-400 group-hover/avatar:text-emerald-500 transition-colors" />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. EXPANDED EDITING VIEW */
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                01 · Edit Profile
              </span>
              <Button
                variant="link"
                className="text-xs text-neutral-500 hover:text-neutral-900 p-0 h-auto"
                onClick={onToggleOverrides}
              >
                {hasOverrides ? 'Reset to Master Profile' : 'Create Variant Override'}
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-xs"
            >
              <Check size={14} />
              <span>Done Editing</span>
            </Button>
          </div>

          {/* Photo Avatar Row */}
          <div className="flex items-center gap-4 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <div className="w-14 h-14 rounded-xl border border-neutral-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPhoto} alt="Profile avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera size={22} className="text-neutral-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-neutral-800">Profile Portrait (Template 05 / CV)</div>
              <div className="text-[11px] text-neutral-500 mb-2">High-resolution portrait photo for executive templates.</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 rounded-lg border-neutral-300"
                  onClick={onOpenPhotoModal}
                >
                  <Crop size={12} className="mr-1" />
                  <span>{currentPhoto ? 'Crop Photo' : 'Upload Photo'}</span>
                </Button>
                {currentPhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                    onClick={onRemovePhoto}
                  >
                    <Trash2 size={12} className="mr-1" />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-neutral-700">Full Name</span>
              <Input
                value={name}
                onChange={e => onEditField('name', e.target.value)}
                placeholder="e.g. Md.Atikur Rahaman"
                className="rounded-xl border-neutral-300 focus:border-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-neutral-700">Professional Title</span>
              <Input
                value={title}
                onChange={e => onEditField('title', e.target.value)}
                placeholder="e.g. Full Stack Developer"
                className="rounded-xl border-neutral-300 focus:border-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-neutral-700">Email Address</span>
              <Input
                value={email}
                onChange={e => onEditField('email', e.target.value)}
                placeholder="e.g. name@example.com"
                className="rounded-xl border-neutral-300 focus:border-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-neutral-700">Phone Number</span>
              <Input
                value={phone}
                onChange={e => onEditField('phone', e.target.value)}
                placeholder="e.g. +1 555 0100"
                className="rounded-xl border-neutral-300 focus:border-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-semibold text-neutral-700">Location / City</span>
              <Input
                value={location}
                onChange={e => onEditField('location', e.target.value)}
                placeholder="e.g. Dhaka, Bangladesh or Remote"
                className="rounded-xl border-neutral-300 focus:border-emerald-500"
              />
            </label>
          </div>

          {/* Contact Links */}
          <div className="pt-2 border-t border-neutral-200">
            <div className="text-xs font-bold text-neutral-800 mb-2">Websites & Social Links</div>
            <div className="space-y-2">
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
                  <div key={index} className="flex items-center gap-2">
                    <NativeSelect
                      size="default"
                      aria-label="Link type"
                      value={link.type}
                      className="w-28 text-xs rounded-xl"
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
                    <span className="text-neutral-400">
                      <Icon size={16} />
                    </span>
                    <Input
                      aria-label="Link label"
                      value={link.label}
                      className="w-32 text-xs rounded-xl"
                      onChange={e => {
                        const links = [...currentLinks];
                        links[index] = { ...links[index], label: e.target.value };
                        onEditLinks(links);
                      }}
                      placeholder="Label"
                    />
                    <Input
                      aria-label="Link URL"
                      value={link.url}
                      className="flex-1 text-xs rounded-xl"
                      onChange={e => {
                        const links = [...currentLinks];
                        links[index] = { ...links[index], url: e.target.value };
                        onEditLinks(links);
                      }}
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onEditLinks(currentLinks.filter((_, i) => i !== index))}
                      className="text-neutral-400 hover:text-rose-600"
                    >
                      ×
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 text-xs rounded-xl border-dashed border-neutral-300 hover:border-emerald-500 hover:text-emerald-600"
              onClick={() =>
                onEditLinks([...currentLinks, { type: 'website', label: 'Website', url: 'https://' }])
              }
            >
              ＋ Add Link
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
