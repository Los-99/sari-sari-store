<script lang="ts">
  import Icon from './Icon.svelte';
  import { pwa, applyUpdate, dismissOfflineReady, dismissUpdate } from '../lib/pwa.svelte';

  // The "ready to work offline" message hides itself after a few seconds.
  $effect(() => {
    if (!pwa.offlineReady) return;
    const timer = setTimeout(dismissOfflineReady, 6000);
    return () => clearTimeout(timer);
  });
</script>

{#if pwa.updateAvailable}
  <div class="banner" role="status">
    <span class="message">A new version of the app is ready.</span>
    <button type="button" class="btn btn-primary" onclick={applyUpdate}>
      <Icon name="refresh" size={20} /> Update
    </button>
    <button type="button" class="close" aria-label="Later" onclick={dismissUpdate}>
      <Icon name="close" size={20} />
    </button>
  </div>
{:else if pwa.offlineReady}
  <div class="banner" role="status">
    <Icon name="check" size={20} />
    <span class="message">Ready to work offline.</span>
    <button type="button" class="close" aria-label="Close" onclick={dismissOfflineReady}>
      <Icon name="close" size={20} />
    </button>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    left: var(--space-3);
    right: var(--space-3);
    bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + var(--space-3));
    z-index: 30;
    max-width: calc(var(--content-max-width) - 2 * var(--space-3));
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    background: var(--color-text);
    color: #fff;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-raised);
  }

  .message {
    flex: 1;
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
</style>
