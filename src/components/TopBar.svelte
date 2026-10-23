<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { goBack } from '../lib/router.svelte';

  let {
    title,
    backTo,
    actions,
  }: {
    title: string;
    /** Show a back arrow. This is where it goes if there is no previous screen. */
    backTo?: string;
    /** Optional buttons on the right, e.g. "Save" or "Edit". */
    actions?: Snippet;
  } = $props();
</script>

<header class="top-bar">
  <div class="inner">
    {#if backTo !== undefined}
      <button type="button" class="icon-button" aria-label="Back" onclick={() => goBack(backTo)}>
        <Icon name="back" />
      </button>
    {/if}
    <h1 class="title">{title}</h1>
    {#if actions}
      <div class="actions">{@render actions()}</div>
    {/if}
  </div>
</header>

<style>
  .top-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-primary);
    color: var(--color-on-primary);
    padding-top: env(safe-area-inset-top);
  }

  .inner {
    max-width: var(--content-max-width);
    margin: 0 auto;
    min-height: var(--top-bar-height);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-2) 0 var(--space-4);
  }

  .icon-button {
    width: var(--touch-target);
    height: var(--touch-target);
    margin-left: calc(-1 * var(--space-3));
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .title {
    flex: 1;
    min-width: 0;
    font-size: var(--text-lg);
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    gap: var(--space-1);
  }
</style>
