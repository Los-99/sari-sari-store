<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
  import { pwa } from '../lib/pwa.svelte';
  import { storage } from '../lib/db/storage.svelte';

  const version = __APP_VERSION__;

  const databaseLabel = $derived(
    storage.status === 'ready' ? 'Ready' : storage.status === 'error' ? 'Error' : 'Opening…',
  );
  const protectedLabel = $derived(
    storage.persisted === true ? 'Yes' : storage.persisted === false ? 'No' : 'Not available',
  );

  // True when the app was opened from its Home Screen icon (not a browser tab).
  const openedFromHomeScreen =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  // True once the offline copy of the app is active on this phone.
  let offlineCopyActive = $state(Boolean(navigator.serviceWorker?.controller));

  $effect(() => {
    if (pwa.offlineReady) offlineCopyActive = true;
    const container = navigator.serviceWorker;
    if (!container) return;
    const update = () => (offlineCopyActive = Boolean(container.controller));
    container.addEventListener('controllerchange', update);
    return () => container.removeEventListener('controllerchange', update);
  });
</script>

<TopBar title="Settings" />

<div class="content">
  <h2 class="section-title">Backup &amp; restore</h2>
  <ComingSoon phase={7} description="Export your products to a file, and restore them on this or another phone." />

  <h2 class="section-title">App status</h2>
  <dl class="card status">
    <div>
      <dt>Opened from Home Screen</dt>
      <dd class:yes={openedFromHomeScreen}>{openedFromHomeScreen ? 'Yes' : 'No'}</dd>
    </div>
    <div>
      <dt>Works offline</dt>
      <dd class:yes={offlineCopyActive}>{offlineCopyActive ? 'Yes' : 'Not yet'}</dd>
    </div>
    <div>
      <dt>Database</dt>
      <dd class:yes={storage.status === 'ready'} class:bad={storage.status === 'error'}>{databaseLabel}</dd>
    </div>
    <div>
      <dt>Protected from automatic clearing</dt>
      <dd class:yes={storage.persisted === true}>{protectedLabel}</dd>
    </div>
    <div>
      <dt>App version</dt>
      <dd>{version}</dd>
    </div>
  </dl>
  {#if storage.status === 'error'}
    <p class="error-text" role="alert">{storage.errorMessage}</p>
  {/if}
  {#if !openedFromHomeScreen}
    <p class="muted hint">
      Tip: add this app to your Home Screen and always open it from there. On iPhone, a Safari tab and the
      Home Screen app keep separate product data.
    </p>
  {/if}
</div>

<style>
  .status {
    margin: 0;
    padding: 0;
  }

  .status div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
  }

  .status div + div {
    border-top: 1px solid var(--color-border);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  dd.yes {
    color: var(--color-ok-text);
  }

  dd.bad,
  .error-text {
    color: var(--color-danger);
  }

  .error-text {
    margin: 0;
  }

  .hint {
    margin: 0;
    font-size: var(--text-sm);
  }
</style>
