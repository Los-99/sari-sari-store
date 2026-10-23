/** Problems the camera can have, each with a plain explanation for the store owner. */
export type CameraProblem = 'denied' | 'no-camera' | 'busy' | 'insecure' | 'unsupported' | 'unknown';

export class CameraError extends Error {
  constructor(readonly problem: CameraProblem) {
    super(problem);
    this.name = 'CameraError';
  }
}

/** Opens the back camera. Throws a CameraError explaining what went wrong. */
export async function openBackCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported');
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (error) {
    throw new CameraError(classify(error));
  }
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };

/** True when this phone lets the browser turn on the flashlight (mostly Android). */
export function supportsTorch(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
  return capabilities?.torch === true;
}

export async function setTorch(stream: MediaStream, on: boolean): Promise<void> {
  const track = stream.getVideoTracks()[0];
  await track?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
}

/** Asks for continuous autofocus where the phone allows it. Harmless if not. */
export async function preferContinuousFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
  if (!capabilities?.focusMode?.includes('continuous')) return;
  try {
    await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
  } catch {
    // Some phones list the option but refuse it; the default focus still works.
  }
}

function classify(error: unknown): CameraProblem {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
    case 'DevicesNotFoundError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    case 'SecurityError':
      return 'insecure';
    default:
      return 'unknown';
  }
}
