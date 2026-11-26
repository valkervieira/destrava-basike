import { useEffect, useRef, useState, type DragEvent } from 'react';
import { convertFile } from './convert';

type Status = 'queued' | 'working' | 'done' | 'error';
type Item = { id: number; name: string; status: Status; progress: number; error?: string };

const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
const canPickFolder = 'showDirectoryPicker' in window;
const isVideo = (f: File) => f.type.startsWith('video/') || /\.(mov|mp4|m4v|avi|mkv)$/i.test(f.name);

function statusLabel(i: Item): string {
  switch (i.status) {
    case 'queued':
      return 'Na fila';
    case 'working':
      return `Convertendo ${Math.round(i.progress * 100)}%`;
    case 'done':
      return 'Pronto';
    case 'error':
      return 'Falhou';
  }
}

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [dragging, setDragging] = useState(false);
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const busy = useRef(false);
  const queue = useRef<{ id: number; file: File }[]>([]);
  const nextId = useRef(1);

  const pending = items.some((i) => i.status === 'queued' || i.status === 'working');
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);

  const patch = (id: number, p: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  async function drain() {
    if (busy.current) return;
    busy.current = true;
    while (queue.current.length) {
      const { id, file } = queue.current.shift()!;
      patch(id, { status: 'working' });
      try {
        await convertFile(file, dirRef.current, (p) => patch(id, { progress: p }));
        patch(id, { status: 'done', progress: 1 });
      } catch (e) {
        patch(id, { status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }
    busy.current = false;
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter(isVideo)
      .map((file) => ({ id: nextId.current++, file }));
    if (added.length === 0) return;
    queue.current.push(...added);
    setItems((prev) => [
      ...prev,
      ...added.map(({ id, file }) => ({
        id,
        name: file.name,
        status: 'queued' as Status,
        progress: 0,
      })),
    ]);
    void drain();
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  }

  async function chooseFolder() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirRef.current = handle;
      setDir(handle);
    } catch {
      /* cancelled */
    }
  }

  if (!hasWebCodecs) {
    return (
      <p className="notice glass">
        Este navegador não suporta a conversão de vídeo. Abra esta página no Chrome ou no Edge, no
        computador.
      </p>
    );
  }

  return (
    <>
      <label
        className="drop glass"
        data-dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          className="sr-only"
          type="file"
          multiple
          accept="video/*,.mov,.MOV"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 15V4m0 0L8 8m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <strong>Clique para escolher os vídeos</strong>
        <small>ou arraste os arquivos para cá. Pode selecionar vários de uma vez.</small>
      </label>

      {canPickFolder && (
        <button type="button" className="link" onClick={chooseFolder}>
          {dir
            ? `Salvando na pasta "${dir.name}". Trocar pasta`
            : 'Salvar em uma pasta, sem pedidos de download'}
        </button>
      )}

      {items.length > 0 && (
        <ul className="files">
          {items.map((i) => (
            <li key={i.id} className="file glass" data-status={i.status}>
              <div className="file-top">
                <span className="file-name" title={i.name}>
                  {i.name}
                </span>
                <span className="file-status">{statusLabel(i)}</span>
              </div>
              {i.status === 'working' && (
                <div
                  className="bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(i.progress * 100)}
                >
                  <div style={{ width: `${Math.round(i.progress * 100)}%` }} />
                </div>
              )}
              {i.error && (
                <p className="file-error">
                  Não foi possível converter este vídeo.
                  <small>{i.error}</small>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
