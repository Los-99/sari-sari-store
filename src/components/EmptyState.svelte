<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';

  // Friendly message for empty lists and "no results", with an optional button.
  let {
    icon,
    title,
    text,
    tone = 'neutral',
    children,
  }: {
    icon: IconName;
    title: string;
    text?: string;
    tone?: 'neutral' | 'good';
    children?: Snippet;
  } = $props();
</script>

<div class="empty card">
  <span class="bubble" class:good={tone === 'good'}><Icon name={icon} size={32} /></span>
  <h2>{title}</h2>
  {#if text}<p>{text}</p>{/if}
  {#if children}<div class="action">{@render children()}</div>{/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-6) var(--space-5);
    text-align: center;
  }

  .bubble {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    margin-bottom: var(--space-2);
    border-radius: 50%;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
  }

  .bubble.good {
    background: var(--color-ok-bg);
    color: var(--color-ok-text);
  }

  h2 {
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    max-width: 32ch;
    color: var(--color-text-muted);
  }

  .action {
    margin-top: var(--space-3);
  }
</style>
