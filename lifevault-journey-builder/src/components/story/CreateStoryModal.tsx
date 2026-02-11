/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Heart, MapPin, Clock, Loader2, CheckCircle } from 'lucide-react';
import { fileToBase64 } from '@/services/api';
import { storyAPI } from '@/services/questApi';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState('A letter to the future');
  const [description, setDescription] = useState(
    'This will unlock at a special place, on a special day.'
  );
  const [recipientEmail, setRecipientEmail] = useState('');

  // Default: 1 hour from now (minimum lock period)
  const [unlockAt, setUnlockAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [radiusMeters, setRadiusMeters] = useState(80);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('Open this when you are back here.');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState('Our place');
  const [locationLoading, setLocationLoading] = useState(false);

  // Grace period: creator can view for 1 hour after creation
  const CREATOR_GRACE_HOURS = 1;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(false);
    fetchLocation();
  }, [isOpen]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocation(null);
        setLocationLoading(false);
        setError(
          'Could not get your location. Please allow location permission and try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setRecipientEmail('');
    setFile(null);
    setPreview(null);
    setNote('Open this when you are back here.');
    setLocation(null);
    setLocationName('Our place');
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    setUnlockAt(d.toISOString().slice(0, 16));
    setRadiusMeters(80);
    setTitle('A letter to the future');
    setDescription('This will unlock at a special place, on a special day.');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (f: File) => {
    // Validate file size (max 10MB)
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }
    // Validate file type
    if (!f.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Title is required.');
      return false;
    }
    if (!file) {
      setError('Please upload a photo for the story chapter.');
      return false;
    }
    if (!location) {
      setError(
        'Location is required for geo-lock. Please allow location permission.'
      );
      return false;
    }

    // Validate unlock date is in the future
    const unlockDate = new Date(unlockAt);
    const now = new Date();
    if (unlockDate <= now) {
      setError('Unlock date must be in the future.');
      return false;
    }

    // Validate radius
    if (radiusMeters < 10 || radiusMeters > 5000) {
      setError('Geo-lock radius must be between 10 and 5000 meters.');
      return false;
    }

    // Validate email format if provided
    if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setError('Please enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const createdAt = new Date().toISOString();
      const creatorAccessUntil = new Date(
        Date.now() + CREATOR_GRACE_HOURS * 60 * 60 * 1000
      ).toISOString();

      // 1) Create the story with grace period metadata
      const storyRes = await storyAPI.create({
        title: title.trim(),
        description: description.trim(),
        recipients: recipientEmail
          ? [{ email: recipientEmail.trim().toLowerCase() }]
          : [],
        isPublic: false,
        settings: {
          theme: 'romantic',
          notifyOnUnlock: true,
          creatorGracePeriod: CREATOR_GRACE_HOURS,
          creatorAccessUntil,
          createdAt,
        },
        occasion: 'other',
      });

      const story = storyRes.data?.data?.story || storyRes.data?.story;
      const storyId = story?._id || story?.id;

      if (!storyId) {
        throw new Error('Story creation failed — no ID returned from server.');
      }

      // 2) Convert file to base64
      const base64 = await fileToBase64(file!);

      // 3) Add chapter with time + geo lock conditions
      const chapterRes = await storyAPI.addChapter(storyId, {
        title: 'Chapter 1',
        subtitle: 'Locked memory',
        content: {
          type: 'photo',
          mediaData: base64,
          caption: note.trim(),
        },
        unlockConditions: {
          requirePreviousChapter: false,
          location: {
            enabled: true,
            name: locationName.trim() || 'Saved location',
            coordinates: {
              type: 'Point',
              coordinates: [location!.lon, location!.lat],
            },
            radiusMeters: Number(radiusMeters),
          },
          time: {
            enabled: true,
            unlockAt: new Date(unlockAt).toISOString(),
          },
        },
        hint: {
          text: `Come back within ${radiusMeters}m of the saved location after ${new Date(unlockAt).toLocaleString()}.`,
        },
        order: 1,
      });

      if (!chapterRes.data) {
        throw new Error('Failed to add chapter to story.');
      }

      // 4) Activate the story so it becomes visible
      await storyAPI.activate(storyId);

      // Store creator grace period info locally for immediate access
      const graceData = {
        storyId,
        createdAt,
        creatorAccessUntil,
        previewBase64: base64,
        title: title.trim(),
        unlockAt: new Date(unlockAt).toISOString(),
        location: { ...location },
        radiusMeters: Number(radiusMeters),
        locationName: locationName.trim(),
        recipientEmail: recipientEmail.trim(),
        note: note.trim(),
      };

      // Save to localStorage for creator grace period access
      const existingGrace = JSON.parse(
        localStorage.getItem('storyGracePeriods') || '[]'
      );
      existingGrace.push(graceData);
      localStorage.setItem('storyGracePeriods', JSON.stringify(existingGrace));

      setSuccess(true);
      setTimeout(() => {
        onCreated?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create story. Please try again.';
      setError(message);
      console.error('Story creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Minimum datetime value (now + 1 minute)
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h2 className="text-xl font-bold text-black">
              Create Locked Story
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-black/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Success message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-green-700 font-medium">
                  Story created successfully!
                </p>
                <p className="text-green-600 text-sm mt-0.5">
                  You can view the image for the next {CREATOR_GRACE_HOURS} hour
                  {CREATOR_GRACE_HOURS > 1 ? 's' : ''}. After that it locks
                  until conditions are met.
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Grace period notice */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm">
            <strong>How it works:</strong> After creating, you can view the
            image for <strong>{CREATOR_GRACE_HOURS} hour</strong>. Then it locks
            until the recipient (or you) visits the saved location after the
            unlock date.
          </div>

          {/* Photo upload */}
          {!file ? (
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                         transition-colors border-black/20 hover:border-black/40"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileChange(e.target.files[0])
                }
              />
              <Upload className="w-12 h-12 text-black/30 mx-auto mb-3" />
              <p className="font-medium text-black">
                Upload a photo for the story
              </p>
              <p className="text-sm text-black/50 mt-1">
                Max 10MB · JPG, PNG, WebP
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-black/50">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Story title <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3 border border-black/10 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-black/20"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Give your story a name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Description
            </label>
            <textarea
              className="w-full px-4 py-3 border border-black/10 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Describe what this story is about"
            />
          </div>

          {/* Recipient email */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Recipient email (optional)
            </label>
            <input
              className="w-full px-4 py-3 border border-black/10 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-black/20"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="friend@example.com"
              type="email"
            />
            <p className="text-xs text-black/40 mt-1">
              The recipient will also be able to unlock this story when
              conditions are met.
            </p>
          </div>

          {/* Unlock conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Time lock */}
            <div className="p-4 bg-gray-50 rounded-lg border border-black/5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-semibold text-black">
                  Unlock date & time
                </p>
              </div>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-black/10 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                value={unlockAt}
                min={minDateTime}
                onChange={(e) => setUnlockAt(e.target.value)}
              />
              <p className="text-xs text-black/40 mt-1">
                Content stays locked until this date
              </p>
            </div>

            {/* Geo lock */}
            <div className="p-4 bg-gray-50 rounded-lg border border-black/5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold text-black">
                  Geo-lock radius
                </p>
              </div>
              <input
                type="number"
                min={10}
                max={5000}
                step={10}
                className="w-full px-3 py-2 border border-black/10 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                value={radiusMeters}
                onChange={(e) =>
                  setRadiusMeters(
                    Math.max(10, Math.min(5000, parseInt(e.target.value || '80', 10)))
                  )
                }
              />
              <p className="text-xs text-black/40 mt-1">
                {locationLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Getting location…
                  </span>
                ) : location ? (
                  `📍 ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                ) : (
                  <span className="text-red-500">
                    Location unavailable —{' '}
                    <button
                      onClick={fetchLocation}
                      className="underline hover:no-underline"
                    >
                      retry
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Location name */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Location name
            </label>
            <input
              className="w-full px-4 py-3 border border-black/10 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-black/20"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Our favorite café"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Note (shown after unlock)
            </label>
            <input
              className="w-full px-4 py-3 border border-black/10 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-black/20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="A message to show after unlocking"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-black/5">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-black
                       hover:bg-black/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || success}
            className="px-6 py-2.5 text-sm font-medium bg-black text-white
                       rounded-lg hover:bg-black/80 transition-colors
                       disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating…' : success ? 'Created ✓' : 'Create Story'}
          </button>
        </div>
      </div>
    </div>
  );
};