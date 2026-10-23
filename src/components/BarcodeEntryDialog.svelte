<script lang="ts">
  import { LIMITS } from '../lib/model/product';
  import { barcodeProblem, normalizeBarcode } from '../lib/util/validation';

  // "Enter barcode manually", for codes the camera can't read.
  let { onSubmit, onClose }: { onSubmit: (code: string) => void; onClose: () => void } = $props();

  let element: HTMLDialogElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let text = $state('');
  let error = $state('');

  $effect(() => {
    if (!element || element.open) return;
    element.showModal();
    input?.focus();
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const code = normalizeBarcode(text);
    if (code === undefined) {
      error = 'Please type the barcode numbers.';
      return;
    }
    const problem = barcodeProblem(code);
    if (problem) {
      error = problem;
      return;
    }
    element?.close();
    onSubmit(code);
  }

  function close() {
    element?.close();
    onClose();
  }
</script>

<dialog
  bind:this={element}
  aria-labelledby="barcode-entry-title"
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
>
  <form onsubmit={submit} novalidate>
    <h2 id="barcode-entry-title">Enter barcode</h2>
    <p class="muted">Type the numbers printed under the barcode lines, including any zeros at the start.</p>
    <label for="barcode-entry-input" class="visually-hidden">Barcode</label>
    <input
      id="barcode-entry-input"
      bind:this={input}
      bind:value={text}
      type="text"
      inputmode="numeric"
      maxlength={LIMITS.barcodeMaxLength}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? 'barcode-entry-error' : undefined}
      oninput={() => (error = '')}
    />
    {#if error}<p class="error" id="barcode-entry-error" role="alert">{error}</p>{/if}
    <div class="buttons">
      <button type="button" class="btn btn-secondary" onclick={close}>Cancel</button>
      <button type="submit" class="btn btn-primary">Look up</button>
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
    margin: var(--space-2) 0 var(--space-4);
  }

  input {
    width: 100%;
    min-height: 56px;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    font-size: var(--text-lg);
    letter-spacing: 0.06em;
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
