<script lang="ts">
  import Icon from './Icon.svelte';
  import { toasts, dismissToast } from '../lib/toast.svelte';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast" class:error={toast.kind === 'error'}>
      <Icon name={toast.kind === 'error' ? 'alert' : 'check'} size={20} />
      <span class="message">{toast.message}</span>
      <button type="button" class="close" aria-label="Close" onclick={() => dismissToast(toast.id)}>
        <Icon name="close" size={18} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-4);
    background: var(--color-text);
    color: #fff;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-raised);
  }

  .toast.error {
    background: var(--color-danger);
  }

  .message {
    flex: 1;
    padding: var(--space-2) 0;
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
