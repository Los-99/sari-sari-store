<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // A panel that slides up from the bottom (e.g. Filters). Uses the
  // browser's built-in dialog, so Back / Escape close it and focus is handled.
  let { title, onClose, children, footer }: { title: string; onClose: () => void; children: Snippet; footer?: Snippet } =
    $props();

  let element: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (element && !element.open) element.showModal();
  });

  function close() {
    element?.close();
    onClose();
  }
</script>

<dialog
  bind:this={element}
  class="sheet"
  aria-labelledby="sheet-title"
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onclick={(event) => {
    // A tap on the dark area outside the panel closes it.
    if (event.target === element) close();
  }}
>
  <div class="panel">
    <span class="handle" aria-hidden="true"></span>
    <header>
      <h2 id="sheet-title">{title}</h2>
      <button type="button" class="close" aria-label="Close" onclick={close}><Icon name="close" /></button>
    </header>
    <div class="body">{@render children()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </div>
</dialog>

<style>
  .sheet {
    width: 100%;
    max-width: var(--content-max-width);
    max-height: 90dvh;
    margin: auto auto 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-lg);
    animation: slide-up 180ms ease-out;
  }

  .sheet::backdrop {
    background: rgb(0 0 0 / 0.4);
  }

  @keyframes slide-up {
    from {
      transform: translateY(40px);
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    padding: var(--space-2) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
  }

  .handle {
    align-self: center;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-border);
    margin-bottom: var(--space-2);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    font-size: var(--text-lg);
  }

  .close {
    width: var(--touch-target);
    height: var(--touch-target);
    margin-right: calc(-1 * var(--space-2));
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-2) 0 var(--space-4);
  }

  footer {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-2);
  }
</style>
