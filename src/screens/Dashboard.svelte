<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
  import { linkTo } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
</script>

<TopBar title="Sari-Sari Store" />

<div class="content">
  <!-- Counts are filled in once the database exists (Phase 3–5). -->
  <section class="stats" aria-label="Stock summary">
    <a class="card stat" href={`#${paths.products}`} onclick={linkTo(paths.products)}>
      <span class="value">—</span>
      <span class="label">Active products</span>
    </a>
    <a class="card stat low" href={`#${paths.inventory}`} onclick={linkTo(paths.inventory)}>
      <span class="value">—</span>
      <span class="label"><Icon name="alert" size={16} /> Low stock</span>
    </a>
    <a class="card stat out" href={`#${paths.inventory}`} onclick={linkTo(paths.inventory)}>
      <span class="value">—</span>
      <span class="label"><Icon name="out" size={16} /> Out of stock</span>
    </a>
  </section>

  <a class="btn btn-primary btn-large" href={`#${paths.scan}`} onclick={linkTo(paths.scan)}>
    <Icon name="scan" size={28} /> Scan barcode
  </a>
  <a class="btn btn-secondary btn-large" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())}>
    <Icon name="plus" size={28} /> Add product
  </a>

  <ComingSoon phase={7} description="A reminder showing how long ago you last backed up your products." />
</div>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    color: inherit;
    text-decoration: none;
    text-align: center;
  }

  .value {
    font-size: var(--text-xl);
    font-weight: 800;
  }

  .label {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .stat.low {
    background: var(--color-low-bg);
  }

  .stat.low .label {
    color: var(--color-low-text);
  }

  .stat.out {
    background: var(--color-out-bg);
  }

  .stat.out .label {
    color: var(--color-out-text);
  }
</style>
