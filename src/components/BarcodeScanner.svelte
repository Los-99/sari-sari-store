<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import {
    CameraError,
    openBackCamera,
    preferContinuousFocus,
    setTorch,
    stopCamera,
    supportsTorch,
    type CameraProblem,
  } from '../lib/scanner/camera';
  import { loadDetector, type Detector } from '../lib/scanner/engine';
  import { ScanConfirmer } from '../lib/scanner/scan-confirmer';
  import { scanFeedback } from '../lib/scanner/feedback';

  /**
   * Live camera view that reads product barcodes inside the guide box.
   * It reports each confirmed barcode once through `onDetected`; the parent
   * sets `paused` while it deals with the result.
   */
  let { paused = false, onDetected }: { paused?: boolean; onDetected: (code: string) => void } = $props();

  type Status = 'starting' | 'scanning' | 'camera-problem' | 'engine-problem';

  let status = $state<Status>('starting');
  let problem = $state<CameraProblem>('unknown');
  let torchAvailable = $state(false);
  let torchOn = $state(false);
  let showHint = $state(false);

  let video: HTMLVideoElement | undefined = $state();
  let guide: HTMLDivElement | undefined = $state();

  let stream: MediaStream | null = null;
  let detector: Detector | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  let lookingSince = Date.now();
  const confirmer = new ScanConfirmer();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  const SCAN_INTERVAL_MS = 120;
  const HINT_AFTER_MS = 8000;

  async function start() {
    stop();
    active = true;
    status = 'starting';
    showHint = false;
    try {
      const opened = await openBackCamera();
      if (!active) {
        stopCamera(opened);
        return;
      }
      stream = opened;
      if (video) {
        video.srcObject = opened;
        await video.play().catch(() => {});
      }
      torchAvailable = supportsTorch(opened);
      torchOn = false;
      void preferContinuousFocus(opened);
    } catch (error) {
      problem = error instanceof CameraError ? error.problem : 'unknown';
      status = 'camera-problem';
      return;
    }

    try {
      detector = await loadDetector();
    } catch (error) {
      console.error('Barcode engine failed to load.', error);
      status = 'engine-problem';
      return;
    }

    if (!active) return;
    status = 'scanning';
    lookingSince = Date.now();
    scheduleScan();
  }

  function stop() {
    active = false;
    clearTimeout(timer);
    stopCamera(stream);
    stream = null;
    if (video) video.srcObject = null;
  }

  function scheduleScan() {
    clearTimeout(timer);
    if (active) timer = setTimeout(scanOnce, SCAN_INTERVAL_MS);
  }

  async function scanOnce() {
    if (!active) return;
    if (!paused && status === 'scanning' && detector) {
      const image = grabGuideArea();
      if (image) {
        try {
          const found = await detector.detect(image);
          const now = Date.now();
          for (const barcode of found) {
            const code = confirmer.read(barcode.rawValue, now);
            if (code && !paused && active) {
              scanFeedback();
              showHint = false;
              onDetected(code);
              break;
            }
          }
        } catch (error) {
          console.warn('Barcode reading failed for one frame.', error);
        }
      }
      showHint = !paused && Date.now() - lookingSince > HINT_AFTER_MS;
    }
    scheduleScan();
  }

  /** Copies only the part of the camera picture inside the guide box. */
  function grabGuideArea(): ImageData | null {
    if (!video || !guide || !context || video.readyState < 2 || !video.videoWidth) return null;
    const view = video.getBoundingClientRect();
    const box = guide.getBoundingClientRect();
    if (!view.width || !view.height) return null;

    // The picture fills the view and is cropped at the edges ("cover").
    const scale = Math.max(view.width / video.videoWidth, view.height / video.videoHeight);
    const offsetX = (video.videoWidth * scale - view.width) / 2;
    const offsetY = (video.videoHeight * scale - view.height) / 2;

    const sx = Math.max(0, (box.left - view.left + offsetX) / scale);
    const sy = Math.max(0, (box.top - view.top + offsetY) / scale);
    const sw = Math.min(video.videoWidth - sx, box.width / scale);
    const sh = Math.min(video.videoHeight - sy, box.height / scale);
    if (sw < 10 || sh < 10) return null;

    // Smaller pictures are read faster; 960 px wide is plenty for a barcode.
    const shrink = Math.min(1, 960 / sw);
    canvas.width = Math.round(sw * shrink);
    canvas.height = Math.round(sh * shrink);
    context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function toggleTorch() {
    if (!stream) return;
    try {
      await setTorch(stream, !torchOn);
      torchOn = !torchOn;
    } catch {
      torchAvailable = false;
    }
  }

  // Start the camera when shown; always release it when leaving.
  $effect(() => {
    // untrack: this runs once when shown, not again when values used inside change.
    untrack(() => void start());
    const onVisibility = () => {
      // Turn the camera off while the app is in the background.
      if (document.hidden) stop();
      else void start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  });

  // When scanning resumes, restart the "can't read it?" timer and the repeat guard.
  $effect(() => {
    if (!paused) {
      lookingSince = Date.now();
      confirmer.resume(lookingSince);
      showHint = false;
    }
  });

  const problemText: Record<CameraProblem, { title: string; body: string }> = {
    denied: {
      title: 'Camera access is off',
      body: 'Allow the camera to scan. iPhone: close and reopen the app and tap Allow, or go to Settings → Apps → Safari → Camera → Allow. Android: Chrome ⋮ → Settings → Site settings → Camera → allow this app.',
    },
    'no-camera': { title: 'No camera found', body: "This device doesn't seem to have a camera the app can use." },
    busy: {
      title: 'Camera is busy',
      body: 'Another app may be using the camera. Close it, then tap Try again.',
    },
    insecure: {
      title: "Camera can't be used here",
      body: 'The camera only works when the app is opened from its secure https:// address or Home Screen icon.',
    },
    unsupported: {
      title: "This browser can't use the camera",
      body: 'Use Safari on iPhone or Chrome on Android.',
    },
    unknown: { title: "Camera didn't start", body: 'Tap Try again. If it keeps failing, close and reopen the app.' },
  };
</script>

<div class="scanner">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted autoplay aria-label="Camera view"></video>

  {#if status === 'starting' || status === 'scanning'}
    <div class="guide" class:paused bind:this={guide} aria-hidden="true"><span class="line"></span></div>
    <p class="status-text" role="status">
      {#if status === 'starting'}
        Starting camera…
      {:else if paused}
        Paused
      {:else if showHint}
        Can't read it? Hold 10–20 cm away, keep steady{torchAvailable ? ', try the flashlight' : ''}, or type it in.
      {:else}
        Point at a barcode
      {/if}
    </p>
    {#if torchAvailable}
      <button
        type="button"
        class="torch"
        class:on={torchOn}
        aria-pressed={torchOn}
        aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
        onclick={toggleTorch}
      >
        <Icon name="flash" />
      </button>
    {/if}
  {:else}
    <div class="problem" role="alert">
      {#if status === 'engine-problem'}
        <h2>The scanner couldn't start</h2>
        <p>Close and reopen the app. You can still type the barcode by hand.</p>
      {:else}
        <h2>{problemText[problem].title}</h2>
        <p>{problemText[problem].body}</p>
      {/if}
      <button type="button" class="btn btn-primary" onclick={start}>Try again</button>
    </div>
  {/if}
</div>

<style>
  .scanner {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 260px;
    overflow: hidden;
    background: #111;
    color: #fff;
  }

  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* The guide box: only barcodes inside it are read. */
  .guide {
    position: absolute;
    left: 50%;
    top: 45%;
    width: min(85%, 420px);
    aspect-ratio: 2 / 1;
    transform: translate(-50%, -50%);
    border: 3px solid #fff;
    border-radius: var(--radius-md);
    box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.45);
  }

  .guide.paused {
    border-color: var(--color-accent);
  }

  .line {
    position: absolute;
    left: 8%;
    right: 8%;
    top: 50%;
    height: 2px;
    background: #ff4d4d;
    opacity: 0.8;
  }

  .status-text {
    position: absolute;
    left: var(--space-4);
    right: var(--space-4);
    bottom: var(--space-4);
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: rgb(0 0 0 / 0.6);
    text-align: center;
    font-weight: 600;
  }

  .torch {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border: 2px solid #fff;
    border-radius: 50%;
    background: rgb(0 0 0 / 0.5);
    color: #fff;
    cursor: pointer;
  }

  .torch.on {
    background: var(--color-accent);
    color: #1c2421;
    border-color: var(--color-accent);
  }

  .problem {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-5);
    text-align: center;
  }

  .problem h2 {
    font-size: var(--text-lg);
  }

  .problem p {
    margin: 0;
    color: #d6dbd8;
    max-width: 36ch;
  }
</style>
