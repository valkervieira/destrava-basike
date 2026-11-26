import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  StreamTarget,
  type StreamTargetChunk,
} from 'mediabunny';

/**
 * Browser equivalent of the ffmpeg command:
 *   -c:v h264_videotoolbox (hardware H.264 via WebCodecs), -r 30 cfr,
 *   -c:a aac 128k, -movflags +faststart, original date kept as creation time.
 *
 * Input is read lazily from the File (never fully loaded in memory).
 * With a folder handle the output streams straight to disk, so file size is
 * not limited by RAM. Without one, the output is buffered and downloaded.
 */
export async function convertFile(
  file: File,
  dir: FileSystemDirectoryHandle | null,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const outName = file.name.replace(/\.[^.]+$/, '') + '.mp4';

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

  let buffer: BufferTarget | null = null;
  let writable: FileSystemWritableFileStream | null = null;
  let output: Output;

  if (dir) {
    const handle = await dir.getFileHandle(outName, { create: true });
    writable = await handle.createWritable();
    output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'reserve' }),
      target: new StreamTarget(writable as unknown as WritableStream<StreamTargetChunk>),
    });
  } else {
    buffer = new BufferTarget();
    output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: buffer,
    });
  }

  try {
    const conversion = await Conversion.init({
      input,
      output,
      showWarnings: false,
      video: {
        codec: 'avc',
        frameRate: 30,
        bitrate: 8_000_000,
        hardwareAcceleration: 'prefer-hardware',
        forceTranscode: true,
      },
      audio: { codec: 'aac', bitrate: 128_000, forceTranscode: true },
      tags: (t) => ({ ...t, creationTime: new Date(file.lastModified) }),
    });

    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks.map((d) => d.reason).join(', ');
      throw new Error(`Cannot convert this file (${reasons || 'unsupported'})`);
    }

    conversion.onProgress = onProgress;
    await conversion.execute();
  } catch (err) {
    if (writable) await writable.abort().catch(() => {});
    throw err;
  } finally {
    input.dispose();
  }

  if (buffer?.buffer) {
    download(new Blob([buffer.buffer], { type: 'video/mp4' }), outName);
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
