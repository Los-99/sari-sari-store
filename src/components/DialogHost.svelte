<script lang="ts">
  import { dialog, answerDialog } from '../lib/dialog.svelte';

  let element: HTMLDialogElement | undefined = $state();

  // Open or close the browser's built-in dialog to match `dialog.current`.
  $effect(() => {
    if (!element) return;
    if (dialog.current && !element.open) element.showModal();
    if (!dialog.current && element.open) element.close();
  });
</script>

<dialog
  bind:this={element}
  aria-labelledby="confirm-title"
  oncancel={(event) => {
    event.preventDefault();
    answerDialog(false);
  }}
>
  {#if dialog.current}
    {@const current = dialog.current}
    <h2 id="confirm-title">{current.title}</h2>
    {#if current.message}<p>{current.message}</p>{/if}
    {#if current.details?.length}
      <ul>
        {#each current.details as detail (detail)}<li>{detail}</li>{/each}
      </ul>
    {/if}
    <div class="buttons">
      <button type="button" class="btn btn-secondary" onclick={() => answerDialog(false)}>
        {current.cancelLabel ?? 'Cancel'}
      </button>
      <button type="button" class="btn btn-primary" class:danger={current.danger} onclick={() => answerDialog(true)}>
        {current.confirmLabel}
      </button>
    </div>
  {/if}
</dialog>

<style>
  dialog {
    width: min(100% - 2 * var(--space-4), 420px);
    padding: var(--space-5) var(--space-4) var(--space-4);
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.25);
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }

  h2 {
    font-size: var(--text-lg);
  }

  p,
  ul {
    margin: var(--space-3) 0 0;
    color: var(--color-text-muted);
  }

  ul {
    padding-left: var(--space-5);
  }

  li + li {
    margin-top: var(--space-2);
  }

  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-top: var(--space-5);
  }

  .danger {
    background: var(--color-danger);
  }
</style>
