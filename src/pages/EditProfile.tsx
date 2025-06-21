import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const EditProfile: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const [tagline, setTagline] = useState('');
  const [website, setWebsite] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const data = await apiService.getEditableProfile(user.id);
        setTagline(data.tagline || '');
        setWebsite(data.website || '');
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };
    load();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let profilePicture;
    if (file) {
      profilePicture = await toBase64(file);
    }
    try {
      const result = await apiService.updateProfile(user.id, { tagline, website, profilePicture });
      updateProfile({
        tagline,
        website,
        avatar: result.profilePicture ?? user.avatar,
        profile_picture: result.profilePicture ?? user.profile_picture,
      });
      navigate(`/profile/${user.username}`);
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  return (
    <div className="edit-profile-card bg-slate-800 p-6 rounded-lg shadow-md max-w-md mx-auto mt-8 text-white">
      <h2 className="text-xl font-semibold mb-4">Edit Your Profile</h2>

      {previewUrl && (
        <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
          <img src={previewUrl} className="object-cover w-full h-full" alt="Profile preview" />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-medium">Profile Picture</label>
        <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4 bg-slate-700 p-2 rounded" />

        <label className="block mb-2 font-medium">Tagline</label>
        <input type="text" maxLength={100} value={tagline} onChange={e => setTagline(e.target.value)} className="w-full p-2 mb-4 rounded bg-slate-700" />

        <label className="block mb-2 font-medium">Website</label>
        <input type="url" value={website} onChange={e => setWebsite(e.target.value)} className="w-full p-2 mb-6 rounded bg-slate-700" />

        <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white p-2 rounded">Save Changes</button>
      </form>
    </div>
  );
};

export default EditProfile;
