<script lang="ts">
  // A row of tappable suggestions under a text box, e.g. categories.
  let {
    options,
    selected,
    label,
    onPick,
  }: {
    options: readonly string[];
    selected: string;
    /** Spoken name for the group, e.g. "Category suggestions". */
    label: string;
    onPick: (option: string) => void;
  } = $props();

  const selectedKey = $derived(selected.trim().toLowerCase());
</script>

<div class="chips" role="group" aria-label={label}>
  {#each options as option (option)}
    <button
      type="button"
      class="chip"
      class:selected={option.toLowerCase() === selectedKey}
      aria-pressed={option.toLowerCase() === selectedKey}
      onclick={() => onPick(option)}
    >
      {option}
    </button>
  {/each}
</div>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .chip {
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .chip.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary-strong);
  }
</style>
