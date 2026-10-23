<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import ProductRow from '../components/ProductRow.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
  import { linkTo } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import { listProducts, productChanges } from '../lib/db/products';
  import { describeError } from '../lib/db/errors';
  import type { Product } from '../lib/model/product';

  let products = $state<Product[] | null>(null);
  let loadError = $state('');
  let showInactive = $state(false);

  async function load() {
    try {
      const all = await listProducts();
      all.sort((a, b) => a.name.localeCompare(b.name, 'en-PH', { sensitivity: 'base' }));
      products = all;
      loadError = '';
    } catch (error) {
      loadError = describeError(error);
    }
  }

  $effect(() => {
    if (storage.status !== 'ready') return;
    void load();
    const refresh = () => void load();
    productChanges.addEventListener('change', refresh);
    return () => productChanges.removeEventListener('change', refresh);
  });

  const inactiveCount = $derived(products?.filter((product) => !product.isActive).length ?? 0);
  const shown = $derived(products?.filter((product) => showInactive || product.isActive) ?? []);
  const errorMessage = $derived(storage.status === 'error' ? storage.errorMessage : loadError);
</script>

<TopBar title="Products" />

<div class="content">
  {#if errorMessage}
    <div class="card error" role="alert">
      <strong>Can't load your products.</strong>
      <p>{errorMessage}</p>
      <button type="button" class="btn btn-secondary" onclick={load}>Try again</button>
    </div>
  {:else if products === null}
    <p class="muted center" aria-busy="true">Loading products…</p>
  {:else if products.length === 0}
    <div class="card empty">
      <Icon name="products" size={40} />
      <h2>No products yet</h2>
      <p class="muted">Add your first product to start tracking your stock.</p>
      <a class="btn btn-primary" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())}>
        <Icon name="plus" /> Add product
      </a>
    </div>
  {:else}
    {#if inactiveCount > 0}
      <label class="toggle">
        <input type="checkbox" bind:checked={showInactive} />
        Show deactivated products ({inactiveCount})
      </label>
    {/if}

    {#if shown.length === 0}
      <p class="muted center">All your products are deactivated.</p>
    {:else}
      <p class="muted count">{shown.length} {shown.length === 1 ? 'product' : 'products'}</p>
      <ul class="list card">
        {#each shown as product (product.id)}
          <li><ProductRow {product} /></li>
        {/each}
      </ul>
    {/if}

    <ComingSoon phase={5} description="Search by name or barcode, filter by category or stock, and sorting." />
  {/if}
  <!-- Room so the round + button never covers the last product. -->
  <div class="fab-space" aria-hidden="true"></div>
</div>

<a class="fab" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())} aria-label="Add product">
  <Icon name="plus" size={28} />
</a>

<style>
  .center {
    text-align: center;
  }

  .error {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error p {
    margin: var(--space-1) 0 var(--space-3);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-6) var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty h2 {
    color: var(--color-text);
    font-size: var(--text-lg);
  }

  .empty p {
    margin: 0 0 var(--space-2);
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--touch-target);
    font-weight: 600;
  }

  .toggle input {
    width: 22px;
    height: 22px;
    accent-color: var(--color-primary);
  }

  .count {
    margin: 0;
    font-size: var(--text-sm);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .list li + li {
    border-top: 1px solid var(--color-border);
  }

  .fab-space {
    height: 56px;
  }

  .fab {
    position: fixed;
    right: var(--space-4);
    bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + var(--space-4));
    z-index: 15;
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-lg);
    background: var(--color-primary);
    color: var(--color-on-primary);
    box-shadow: var(--shadow-raised);
  }
</style>
