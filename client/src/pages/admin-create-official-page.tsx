import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../components/ui';
import { LevelEditor } from '../features/editor/level-editor';
import { moveLocalEditorDraft } from '../features/editor/local-draft-storage';
import { apiRequest } from '../services/api';
import type { Level } from '../types/models';

export function AdminCreateOfficialPage() {
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      theme: string;
      dataJson: Level['dataJson'];
    }) =>
      apiRequest<{ level: Level }>('/api/admin/levels/create-official', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          publishNow: false,
          featured: false,
          isVisible: true,
        }),
      }),
    onSuccess: (payload) => {
      moveLocalEditorDraft('admin-official-new', payload.level.id);
      navigate(`/admin/levels/${payload.level.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <Panel className="game-screen bg-transparent p-0">
        <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-4">
            <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Admin Forge</p>
            <h2 className="font-display text-4xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-6xl">
              Create
              <br />
              Official
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-white/82">
              A new official stage starts as an admin draft, then receives its difficulty icon, automatic star reward,
              and final publish status.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Step 1</p>
              <p className="mt-2 font-display text-xl text-white">Build Draft</p>
            </div>
            <div className="game-stat px-4 py-4">
              <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Step 2</p>
              <p className="mt-2 font-display text-xl text-white">Tune & Publish</p>
            </div>
          </div>
        </div>
      </Panel>

      <LevelEditor
        draftStorageKey="admin-official-new"
        saveLabel="Save Admin Draft"
        onClose={() => navigate('/admin/levels')}
        onSave={(payload) => createMutation.mutateAsync(payload).then(() => undefined)}
      />
    </div>
  );
}
