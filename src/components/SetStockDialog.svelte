<script lang="ts">
  import { untrack } from 'svelte';
  import { LIMITS, type Product } from '../lib/model/product';
  import { parseWholeNumber } from '../lib/util/validation';
  import { setStock } from '../lib/db/products';
  import { describeError } from '../lib/db/errors';
  import { showToast } from '../lib/toast.svelte';
  import { formatQuantity } from '../lib/util/format';

  // "Set stock to an exact number", e.g. after counting the shelf.
  let { product, onClose }: { product: Product; onClose: () => void } = $props();

  let element: HTMLDialogElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let text = $state('');
  let error = $state('');
  let saving = $state(false);

  // Runs once when the dialog appears. `untrack` stops a product refresh
  // from resetting what the user is typing.
  $effect(() => {
    if (!element || element.open) return;
    text = untrack(() => String(product.stockQuantity));
    element.showModal();
    input?.select();
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const parsed = parseWholeNumber(text, 'stock', LIMITS.maxStock);
    if (!parsed.ok) {
      error = parsed.error;
      return;
    }
    saving = true;
    try {
      const updated = await setStock(product.id, parsed.value);
      showToast(`Stock set to ${formatQuantity(updated.stockQuantity, updated.unit)}.`);
      close();
    } catch (failure) {
      error = describeError(failure);
    } finally {
      saving = false;
    }
  }

  function close() {
    element?.close();
    onClose();
  }
</script>

<dialog
  bind:this={element}
  aria-labelledby="set-stock-title"
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
>
  <form onsubmit={save} novalidate>
    <h2 id="set-stock-title">Set stock</h2>
    <p class="muted">{product.name}</p>
    <label for="set-stock-input">New stock count ({product.unit})</label>
    <input
      id="set-stock-input"
      bind:this={input}
      bind:value={text}
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="off"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? 'set-stock-error' : undefined}
      oninput={() => (error = '')}
    />
    {#if error}<p class="error" id="set-stock-error" role="alert">{error}</p>{/if}
    <div class="buttons">
      <button type="button" class="btn btn-secondary" onclick={close}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  </form>
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

  p {
    margin: var(--space-1) 0 var(--space-4);
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: var(--space-2);
  }

  input {
    width: 100%;
    min-height: 56px;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-xl);
    font-weight: 700;
    text-align: center;
  }

  .error {
    margin: var(--space-2) 0 0;
    color: var(--color-danger);
    font-weight: 600;
  }

  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-top: var(--space-5);
  }
</style>
