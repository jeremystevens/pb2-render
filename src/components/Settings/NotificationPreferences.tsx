import React from 'react';

export interface NotificationPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklySummary: boolean;
}

interface Props {
  prefs: NotificationPrefs;
  onChange: (prefs: NotificationPrefs) => void;
}

export const NotificationPreferences: React.FC<Props> = ({ prefs, onChange }) => {
  const toggle = (key: keyof NotificationPrefs) => {
    onChange({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900 dark:text-white">Email Notifications</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Receive notifications via email</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={prefs.emailNotifications}
            onChange={() => toggle('emailNotifications')}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900 dark:text-white">Push Notifications</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Receive push notifications in your browser</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={prefs.pushNotifications}
            onChange={() => toggle('pushNotifications')}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900 dark:text-white">Weekly Summary</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Get a weekly summary of your activity</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={prefs.weeklySummary}
            onChange={() => toggle('weeklySummary')}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
        </label>
      </div>
    </div>
  );
};

export default NotificationPreferences;
