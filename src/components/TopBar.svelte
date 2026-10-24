<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { goBack } from '../lib/router.svelte';

  let {
    title,
    showTitle = true,
    backTo,
    actions,
  }: {
    title: string;
    /** false = title is only read out by screen readers (e.g. when the page shows it big). */
    showTitle?: boolean;
    /** Show a back arrow. This is where it goes if there is no previous screen. */
    backTo?: string;
    /** Optional buttons on the right, e.g. "Edit". */
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
    <h1 class="title" class:visually-hidden={!showTitle} class:with-back={backTo !== undefined}>{title}</h1>
    {#if !showTitle}<span class="spacer"></span>{/if}
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
    background: rgb(255 255 255 / 0.96);
    border-bottom: 1px solid var(--color-border);
    padding-top: env(safe-area-inset-top);
    backdrop-filter: saturate(1.4) blur(8px);
    -webkit-backdrop-filter: saturate(1.4) blur(8px);
  }

  .inner {
    max-width: var(--content-max-width);
    margin: 0 auto;
    min-height: var(--top-bar-height);
    display: flex;
    align-items: center;
    gap: var(--space-1);
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
    color: var(--color-primary);
    cursor: pointer;
  }

  .icon-button:active {
    background: var(--color-primary-soft);
  }

  .title {
    flex: 1;
    min-width: 0;
    font-size: var(--text-lg);
    font-weight: 750;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spacer {
    flex: 1;
  }

  .actions {
    display: flex;
    gap: var(--space-1);
  }

  /* Text buttons and links placed in the bar. */
  .actions :global(.btn) {
    min-height: 40px;
    padding: 0 var(--space-3);
    color: var(--color-primary);
    font-weight: 700;
  }
</style>
