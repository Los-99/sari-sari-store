<script lang="ts">
  import type { Snippet } from 'svelte';

  // A labelled form box with room for a hint and an error message.
  // The input itself is passed in as `children` and must use `id`.
  let {
    id,
    label,
    required = false,
    hint,
    error,
    children,
  }: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: Snippet;
  } = $props();
</script>

<div class="field" class:has-error={Boolean(error)}>
  <label for={id}>
    {label}{#if required}<span class="required" aria-hidden="true"> *</span>{/if}
  </label>
  {@render children()}
  {#if error}
    <p class="error" id={`${id}-error`} role="alert">{error}</p>
  {:else if hint}
    <p class="hint" id={`${id}-hint`}>{hint}</p>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  label {
    font-weight: 650;
    font-size: var(--text-sm);
  }

  .required {
    color: var(--color-danger);
  }

  .hint,
  .error {
    margin: 0;
    font-size: var(--text-sm);
  }

  .hint {
    color: var(--color-text-muted);
  }

  .error {
    color: var(--color-danger);
    font-weight: 600;
  }

  /* Shared look for every text box placed inside a Field. */
  .field :global(input) {
    width: 100%;
    min-height: var(--touch-target);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    font-size: var(--text-md);
  }

  .field :global(input::placeholder) {
    color: var(--color-text-muted);
    opacity: 0.8;
  }

  .field :global(input:focus) {
    border-color: var(--color-primary);
    outline: 3px solid var(--color-primary-soft);
    outline-offset: 0;
  }

  .has-error :global(input) {
    border-color: var(--color-danger);
  }
</style>
