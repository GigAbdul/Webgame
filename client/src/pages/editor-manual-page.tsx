import { Link } from 'react-router-dom';

const editorManualSections = [
  {
    step: '01',
    title: 'Move Around',
    points: ['Drag the stage to pan', 'Mouse wheel zooms', 'Reset zoom when the grid feels lost'],
  },
  {
    step: '02',
    title: 'Build The Route',
    points: ['Pick a block, hazard, portal, or trigger', 'Click the grid to place', 'Drag selected objects to tune timing'],
  },
  {
    step: '03',
    title: 'Edit Fast',
    points: ['Use undo and redo often', 'Duplicate patterns instead of rebuilding', 'Delete only the selected object or area'],
  },
  {
    step: '04',
    title: 'Test And Publish',
    points: ['Run preview before saving', 'Fix impossible jumps immediately', 'Submit when the route is clearable'],
  },
] as const;

const editorManualShortcuts = [
  ['Space / Click', 'Jump or hold input'],
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Y', 'Redo'],
  ['Delete', 'Remove selection'],
  ['Esc', 'Cancel current tool'],
] as const;

export function EditorManualPage() {
  return (
    <main className="editor-manual-page">
      <div className="editor-manual-scene" aria-hidden="true">
        <div className="editor-manual-grid" />
        <div className="editor-manual-floor" />
      </div>

      <Link to="/" className="editor-manual-back" aria-label="Back to home">
        <span className="gd-classic-back-button-icon" />
      </Link>

      <section className="game-home-panel game-home-panel--manual" aria-labelledby="editor-manual-title">
        <div className="game-home-panel-header">
          <div>
            <p className="game-home-panel-kicker">Forge Guide</p>
            <h1 id="editor-manual-title" className="game-home-panel-title">
              Editor Manual
            </h1>
          </div>
          <Link to="/my-levels/new" className="game-home-close editor-manual-action">
            New Level
          </Link>
        </div>

        <div className="editor-manual-hero">
          <p>Build clean routes, test often, and publish only after the full run feels fair.</p>
        </div>

        <div className="editor-manual-grid-list">
          {editorManualSections.map((section) => (
            <article key={section.step} className="editor-manual-card">
              <span className="editor-manual-step">{section.step}</span>
              <h2>{section.title}</h2>
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="editor-manual-shortcuts" aria-label="Editor shortcuts">
          <h2>Quick Keys</h2>
          <div className="editor-manual-shortcut-grid">
            {editorManualShortcuts.map(([key, action]) => (
              <div key={key} className="editor-manual-shortcut">
                <kbd>{key}</kbd>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
