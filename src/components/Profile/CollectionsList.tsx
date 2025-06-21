import React from 'react';
import { Folder } from 'lucide-react';
import { Collection } from '../../types';

interface Props {
  collections: Collection[];
}

export const CollectionsList: React.FC<Props> = ({ collections }) => {
  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No collections yet</h3>
        <p className="text-slate-600 dark:text-slate-400">This user hasn't created any collections.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {collections.map((col) => (
        <div key={col.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="font-semibold text-slate-900 dark:text-white">{col.name}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{col.description}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">{col.pastes.length} pastes</span>
        </div>
      ))}
    </div>
  );
};
