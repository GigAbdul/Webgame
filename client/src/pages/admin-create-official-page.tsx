import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../components/ui';
import { LevelEditor } from '../features/editor/level-editor';
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
          starsReward: 0,
          featured: false,
          isVisible: true,
        }),
      }),
    onSuccess: (payload) => {
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
              Новый official stage сначала создаётся как admin draft, а уже потом получает difficulty, stars reward и
              publish status.
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
        saveLabel="Save Admin Draft"
        onSave={(payload) => createMutation.mutateAsync(payload).then(() => undefined)}
        sidebarSlot={
          <Panel className="game-screen bg-transparent">
            <div className="space-y-3">
              <h3 className="font-display text-2xl text-white">Admin Workflow</h3>
              <p className="text-sm leading-7 text-white/78">
                После первого сохранения ты попадёшь на detail screen, где уже настраиваются stars reward, featured flag
                и публикация.
              </p>
            </div>
          </Panel>
        }
      />
    </div>
  );
}
