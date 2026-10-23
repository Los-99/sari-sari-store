<script lang="ts">
  import Icon from './Icon.svelte';
  import BarcodeScanner from './BarcodeScanner.svelte';
  import { openOverlay } from '../lib/router.svelte';

  // Full-screen camera that reads one barcode and hands it back, e.g. to fill
  // the barcode field of the product form or the search box.
  let {
    title,
    onResult,
    onClose,
  }: { title: string; onResult: (code: string) => void; onClose: () => void } = $props();

  $effect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // The phone's Back button closes the camera, not the screen underneath.
    const release = openOverlay(() => onClose());
    return () => {
      window.removeEventListener('keydown', onKey);
      release();
    };
  });
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={title}>
  <header>
    <h2>{title}</h2>
    <button type="button" class="close" aria-label="Close scanner" onclick={onClose}>
      <Icon name="close" size={28} />
    </button>
  </header>
  <div class="camera">
    <BarcodeScanner onDetected={onResult} />
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    background: #111;
    color: #fff;
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--top-bar-height);
    padding: env(safe-area-inset-top) var(--space-2) 0 var(--space-4);
  }

  h2 {
    flex: 1;
    font-size: var(--text-lg);
  }

  .close {
    width: var(--touch-target);
    height: var(--touch-target);
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .camera {
    flex: 1;
    min-height: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>
