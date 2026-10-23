<script lang="ts">
  // A whole-number box with large − and + buttons on each side.
  let {
    id,
    value = $bindable(),
    label,
    max,
    describedBy,
    invalid = false,
  }: {
    id: string;
    value: string;
    /** Used for the buttons' spoken names, e.g. "stock". */
    label: string;
    max: number;
    describedBy?: string;
    invalid?: boolean;
  } = $props();

  function step(change: number) {
    const current = /^\d+$/.test(value.trim()) ? Number(value.trim()) : 0;
    value = String(Math.min(max, Math.max(0, current + change)));
  }
</script>

<div class="stepper">
  <button type="button" aria-label={`Decrease ${label}`} onclick={() => step(-1)}>−</button>
  <input
    {id}
    type="text"
    inputmode="numeric"
    pattern="[0-9]*"
    autocomplete="off"
    bind:value
    aria-describedby={describedBy}
    aria-invalid={invalid}
  />
  <button type="button" aria-label={`Increase ${label}`} onclick={() => step(1)}>+</button>
</div>

<style>
  .stepper {
    display: grid;
    grid-template-columns: var(--touch-target) 1fr var(--touch-target);
    gap: var(--space-2);
  }

  .stepper input {
    text-align: center;
    font-weight: 700;
  }

  button {
    height: var(--touch-target);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-primary);
    font-size: var(--text-xl);
    line-height: 1;
    cursor: pointer;
  }

  button:active {
    background: var(--color-primary-soft);
  }
</style>
