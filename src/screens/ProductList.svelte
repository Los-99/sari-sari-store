<script lang="ts">
  import { tick, untrack } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import ProductRow from '../components/ProductRow.svelte';
  import ScanOverlay from '../components/ScanOverlay.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import Sheet from '../components/Sheet.svelte';
  import { linkTo, replaceAddress, savedScrollPosition } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import { listPhotoThumbs, listProducts, productChanges } from '../lib/db/products';
  import type { PhotoImage } from '../lib/model/photo';
  import { describeError } from '../lib/db/errors';
  import type { Product } from '../lib/model/product';
  import { summarizeStock } from '../lib/util/stock';
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
  let products = $state.raw<Product[] | null>(null);
  let loadError = $state('');
  let scanning = $state(false);
  let showFilters = $state(false);
  /** Small product pictures, by product id. */
  let thumbs = $state.raw<Map<number, PhotoImage>>(new Map());

  async function load() {
    try {
      const first = products === null;
      const [all, pictures] = await Promise.all([listProducts(), listPhotoThumbs()]);
      thumbs = pictures;
      products = all;
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
  const counts = $derived(summarizeStock(products ?? []));
  const categories = $derived.by(() => {
    const used = products ? categoriesInUse(products) : [];
    // Keep a category chosen earlier selectable even if no product uses it any more.
    return query.category !== null && !used.includes(query.category) ? [query.category, ...used] : used;
  });
  const inactiveCount = $derived(products?.filter((product) => !product.isActive).length ?? 0);
  const filtered = $derived(isFiltered(query));
  /** How many settings inside the Filters sheet are changed from normal. */
  const sheetFilterCount = $derived(
    (query.category !== null ? 1 : 0) +
      (query.sort !== 'name' ? 1 : 0) +
      (query.showInactive ? 1 : 0) +
      (query.stock === 'attention' ? 1 : 0),
  );
  const errorMessage = $derived(storage.status === 'error' ? storage.errorMessage : loadError);

  const chips: { stock: StockFilter; label: string; count: () => number }[] = [
    { stock: 'all', label: 'All', count: () => counts.active },
    { stock: 'low', label: 'Low', count: () => counts.low },
    { stock: 'out', label: 'Out', count: () => counts.out },
  ];

  function clearFilters() {
    query = { ...DEFAULT_QUERY, sort: query.sort, showInactive: query.showInactive };
  }

  function resetSheet() {
    query = { ...query, category: null, stock: 'all', sort: 'name', showInactive: false };
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
    <EmptyState icon="products" title="No products yet" text="Add your first product to start tracking your stock.">
      <a class="btn btn-primary" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())}>
        <Icon name="plus" /> Add product
      </a>
    </EmptyState>
  {:else}
    <div class="tools" role="search">
      <div class="search">
        <span class="search-icon"><Icon name="search" size={20} /></span>
        <label for="product-search" class="visually-hidden">Search by name or barcode</label>
        <input
          id="product-search"
          type="search"
          placeholder="Name or barcode"
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
        <button type="button" class="search-scan" aria-label="Scan a barcode to search" onclick={() => (scanning = true)}>
          <Icon name="scan" />
        </button>
      </div>

      <div class="chip-row">
        <div class="chips" role="group" aria-label="Stock level">
          {#each chips as chip (chip.stock)}
            <button
              type="button"
              class="chip chip-{chip.stock}"
              class:selected={query.stock === chip.stock}
              aria-pressed={query.stock === chip.stock}
              onclick={() => (query.stock = chip.stock)}
            >
              {chip.label} <span class="chip-count">{chip.count()}</span>
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="chip filters"
          class:selected={sheetFilterCount > 0}
          onclick={() => (showFilters = true)}
          aria-label={`Filters and sorting${sheetFilterCount ? `, ${sheetFilterCount} on` : ''}`}
        >
          <Icon name="settings" size={18} />
          {#if sheetFilterCount > 0}<span class="chip-count">{sheetFilterCount}</span>{/if}
        </button>
      </div>
    </div>

    <div class="summary">
      <p class="muted count" role="status">
        {results.length}
        {results.length === 1 ? 'product' : 'products'}{filtered ? ' found' : ''}
        {#if query.sort !== 'name'}<span> · {SORT_LABELS[query.sort]}</span>{/if}
      </p>
      {#if filtered}
        <button type="button" class="link-button" onclick={clearFilters}>Clear</button>
      {/if}
    </div>

    {#if results.length === 0}
      <EmptyState
        icon="search"
        title={query.text.trim() ? `No products match “${query.text.trim()}”` : 'No products match these filters'}
        text="Check the spelling, try part of the name, or clear the filters."
      >
        <button type="button" class="btn btn-secondary" onclick={clearFilters}>Clear search &amp; filters</button>
      </EmptyState>
    {:else}
      <ul class="list-card">
        {#each results as product (product.id)}
          <li><ProductRow {product} thumb={thumbs.get(product.id)} /></li>
        {/each}
      </ul>
    {/if}
  {/if}
  <!-- Room so the round + button never covers the last product. -->
  <div class="fab-space" aria-hidden="true"></div>
</div>

{#if showFilters}
  <Sheet title="Filters & sorting" onClose={() => (showFilters = false)}>
    <label class="sheet-field">
      <span>Category</span>
      <select bind:value={query.category}>
        <option value={null}>All categories</option>
        {#each categories as category (category)}
          <option value={category}>{category}</option>
        {/each}
      </select>
    </label>
    <label class="sheet-field">
      <span>Stock level</span>
      <select bind:value={query.stock}>
        {#each Object.entries(STOCK_FILTER_LABELS) as [value, label] (value)}
          <option value={value as StockFilter}>{label}</option>
        {/each}
      </select>
    </label>
    <label class="sheet-field">
      <span>Sort by</span>
      <select bind:value={query.sort}>
        {#each Object.entries(SORT_LABELS) as [value, label] (value)}
          <option value={value as SortOrder}>{label}</option>
        {/each}
      </select>
    </label>
    {#if inactiveCount > 0}
      <label class="toggle">
        <input type="checkbox" bind:checked={query.showInactive} />
        Show deactivated products ({inactiveCount})
      </label>
    {/if}
    {#snippet footer()}
      <button type="button" class="btn btn-secondary" onclick={resetSheet}>Reset</button>
      <button type="button" class="btn btn-primary" onclick={() => (showFilters = false)}>
        Show {results.length} {results.length === 1 ? 'product' : 'products'}
      </button>
    {/snippet}
  </Sheet>
{/if}

{#if scanning}
  <ScanOverlay
    title="Scan to search"
    onResult={(code) => {
      scanning = false;
      query.text = code;
    }}
    onClose={() => (scanning = false)}
  />
{/if}

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

  .tools {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .search {
    position: relative;
  }

  .search input {
    width: 100%;
    min-height: 52px;
    padding: 0 calc(2 * var(--touch-target)) 0 44px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    font-size: var(--text-md);
    box-shadow: var(--shadow-sm);
    -webkit-appearance: none;
    appearance: none;
  }

  .search input:focus {
    border-color: var(--color-primary);
    outline: 3px solid var(--color-primary-soft);
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

  .search-scan,
  .clear {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: var(--touch-target);
    height: var(--touch-target);
    display: grid;
    place-items: center;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    cursor: pointer;
  }

  .search-scan {
    right: 2px;
    color: var(--color-primary);
  }

  .clear {
    right: calc(var(--touch-target) + 2px);
    color: var(--color-text-muted);
  }

  .chip-row {
    display: flex;
    gap: var(--space-2);
  }

  .chips {
    flex: 1;
    display: flex;
    gap: var(--space-2);
  }

  .chip {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
  }

  .chip-count {
    min-width: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--color-surface-sunken);
    color: var(--color-text-on-grey);
    font-size: var(--text-xs);
    line-height: 20px;
  }

  .chip.selected {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .chip.selected .chip-count {
    background: rgb(255 255 255 / 0.2);
    color: var(--color-on-primary);
  }

  .chip-low:not(.selected) .chip-count {
    background: var(--color-low-bg);
    color: var(--color-low-text);
  }

  .chip-out:not(.selected) .chip-count {
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .filters {
    flex: none;
    width: auto;
    min-width: 48px;
  }

  /* Small phones (e.g. 320 px wide): tighter chips so all of them fit. */
  @media (max-width: 359px) {
    .chips,
    .chip-row {
      gap: 6px;
    }

    .chip {
      padding: 0 var(--space-2);
      gap: 4px;
    }
  }

  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 24px;
    margin: calc(-1 * var(--space-2)) 0;
  }

  .count {
    margin: 0;
    font-size: var(--text-sm);
  }

  .sheet-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-weight: 650;
  }

  .sheet-field select {
    width: 100%;
    min-height: var(--touch-target);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    /* 16px or more: smaller text makes iPhone zoom in when the box is tapped. */
    font-size: 1rem;
    font-weight: 600;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--touch-target);
    font-weight: 650;
  }

  .toggle input {
    width: 22px;
    height: 22px;
    accent-color: var(--color-primary);
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

  .fab:active {
    background: var(--color-primary-strong);
  }
</style>
