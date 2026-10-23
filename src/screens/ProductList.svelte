<script lang="ts">
  import { tick, untrack } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import ProductRow from '../components/ProductRow.svelte';
  import { linkTo, replaceAddress, savedScrollPosition } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import { listProducts, productChanges } from '../lib/db/products';
  import { describeError } from '../lib/db/errors';
  import type { Product } from '../lib/model/product';
  import {
    DEFAULT_QUERY,
    SORT_LABELS,
    STOCK_FILTER_LABELS,
    categoriesInUse,
    filterProducts,
    isFiltered,
    type ProductQuery,
    type SortOrder,
    type StockFilter,
  } from '../lib/util/product-filter';

  let { initialQuery }: { initialQuery: ProductQuery } = $props();

  // The search starts from the address (so Back and Home's links work),
  // then lives here; every change is written back to the address.
  let query = $state<ProductQuery>(untrack(() => ({ ...initialQuery })));
  let products = $state<Product[] | null>(null);
  let loadError = $state('');

  async function load() {
    try {
      const first = products === null;
      products = await listProducts();
      loadError = '';
      if (first) {
        const scrollY = savedScrollPosition();
        if (scrollY) {
          await tick();
          window.scrollTo(0, scrollY);
        }
      }
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

  $effect(() => {
    replaceAddress(paths.productsMatching({ ...query }));
  });

  const results = $derived(products ? filterProducts(products, query) : []);
  const categories = $derived.by(() => {
    const used = products ? categoriesInUse(products) : [];
    // Keep a category chosen earlier selectable even if no product uses it any more.
    return query.category !== null && !used.includes(query.category) ? [query.category, ...used] : used;
  });
  const inactiveCount = $derived(products?.filter((product) => !product.isActive).length ?? 0);
  const filtered = $derived(isFiltered(query));
  const errorMessage = $derived(storage.status === 'error' ? storage.errorMessage : loadError);

  function clearFilters() {
    query = { ...DEFAULT_QUERY, sort: query.sort, showInactive: query.showInactive };
  }
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
    <div class="tools" role="search">
      <div class="search">
        <span class="search-icon"><Icon name="search" size={20} /></span>
        <label for="product-search" class="visually-hidden">Search by name or barcode</label>
        <input
          id="product-search"
          type="search"
          placeholder="Search name or barcode"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="search"
          bind:value={query.text}
          onkeydown={(event) => {
            // Hide the keyboard so the results are visible.
            if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur();
          }}
        />
        {#if query.text}
          <button type="button" class="clear" aria-label="Clear search" onclick={() => (query.text = '')}>
            <Icon name="close" size={20} />
          </button>
        {/if}
      </div>

      <div class="selects">
        <label>
          <span class="visually-hidden">Category</span>
          <select bind:value={query.category} class:active={query.category !== null}>
            <option value={null}>All categories</option>
            {#each categories as category (category)}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </label>
        <label>
          <span class="visually-hidden">Stock level</span>
          <select bind:value={query.stock} class:active={query.stock !== 'all'}>
            {#each Object.entries(STOCK_FILTER_LABELS) as [value, label] (value)}
              <option value={value as StockFilter}>{label}</option>
            {/each}
          </select>
        </label>
        <label class="wide">
          <span class="visually-hidden">Sort by</span>
          <select bind:value={query.sort}>
            {#each Object.entries(SORT_LABELS) as [value, label] (value)}
              <option value={value as SortOrder}>Sort: {label}</option>
            {/each}
          </select>
        </label>
      </div>

      {#if inactiveCount > 0}
        <label class="toggle">
          <input type="checkbox" bind:checked={query.showInactive} />
          Show deactivated products ({inactiveCount})
        </label>
      {/if}
    </div>

    <div class="summary">
      <p class="muted count" role="status">
        {results.length}
        {results.length === 1 ? 'product' : 'products'}{filtered ? ' found' : ''}
      </p>
      {#if filtered}
        <button type="button" class="link-button" onclick={clearFilters}>Clear search &amp; filters</button>
      {/if}
    </div>

    {#if results.length === 0}
      <div class="card empty">
        <Icon name="search" size={36} />
        {#if query.text.trim()}
          <h2>No products match “{query.text.trim()}”</h2>
        {:else}
          <h2>No products match these filters</h2>
        {/if}
        <p class="muted">Check the spelling, try part of the name, or clear the filters.</p>
        <button type="button" class="btn btn-secondary" onclick={clearFilters}>Clear search &amp; filters</button>
      </div>
    {:else}
      <ul class="list card">
        {#each results as product (product.id)}
          <li><ProductRow {product} /></li>
        {/each}
      </ul>
    {/if}
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
    overflow-wrap: anywhere;
  }

  .empty p {
    margin: 0 0 var(--space-2);
  }

  .tools {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .search {
    position: relative;
  }

  .search input {
    width: 100%;
    min-height: 52px;
    padding: 0 var(--touch-target) 0 44px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    font-size: var(--text-md);
    -webkit-appearance: none;
    appearance: none;
  }

  .search input:focus {
    border-color: var(--color-primary);
    outline: 2px solid var(--color-primary-soft);
    outline-offset: 0;
  }

  /* Hide the browser's own small "x"; we show a bigger one. */
  .search input::-webkit-search-cancel-button {
    display: none;
  }

  .search-icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    display: grid;
  }

  .clear {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: var(--touch-target);
    height: var(--touch-target);
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .selects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .selects .wide {
    grid-column: 1 / -1;
  }

  select {
    width: 100%;
    min-height: var(--touch-target);
    padding: 0 var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  select.active {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary-strong);
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

  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 32px;
  }

  .count {
    margin: 0;
    font-size: var(--text-sm);
  }

  .link-button {
    min-height: var(--touch-target);
    border: 0;
    background: transparent;
    color: var(--color-primary);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
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
