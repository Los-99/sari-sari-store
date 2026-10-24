<script lang="ts">
  import { tick, untrack } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import StockBadge from '../components/StockBadge.svelte';
  import SetStockDialog from '../components/SetStockDialog.svelte';
  import { linkTo, replaceAddress, savedScrollPosition } from '../lib/router.svelte';
  import { paths, type InventoryView } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import { adjustStock, listProducts, productChanges } from '../lib/db/products';
  import { describeError } from '../lib/db/errors';
  import { showToast } from '../lib/toast.svelte';
  import type { Product } from '../lib/model/product';
  import { stockStatus, summarizeStock } from '../lib/util/stock';
  import { formatQuantity } from '../lib/util/format';

  let { initialView }: { initialView: InventoryView } = $props();

  let view = $state<InventoryView>(untrack(() => initialView));
  let products = $state<Product[] | null>(null);
  let loadError = $state('');
  let settingStockFor = $state<Product | null>(null);

  /**
   * The products listed when this tab was opened. A product you restock
   * stays in the Low / Out list (marked "Restocked") until you switch tabs
   * or leave, so rows don't jump away while you're tapping +.
   */
  let listedIds = $state<Set<number> | null>(null);

  function idsFor(all: Product[], which: InventoryView): Set<number> {
    return new Set(
      all
        .filter((product) => product.isActive && (which === 'all' || stockStatus(product) === which))
        .map((product) => product.id),
    );
  }

  async function load() {
    try {
      const first = products === null;
      const all = await listProducts();
      products = all;
      loadError = '';
      if (listedIds === null) listedIds = idsFor(all, view);
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

  function showView(next: InventoryView) {
    view = next;
    listedIds = products ? idsFor(products, next) : null;
    replaceAddress(paths.inventoryView(next));
    window.scrollTo(0, 0);
  }

  const counts = $derived(summarizeStock(products ?? []));
  const rows = $derived(
    (products ?? [])
      .filter((product) => product.isActive && (view === 'all' || listedIds?.has(product.id)))
      .sort(
        (a, b) =>
          a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name, 'en-PH', { sensitivity: 'base' }),
      ),
  );
  const errorMessage = $derived(storage.status === 'error' ? storage.errorMessage : loadError);

  const tabs: { view: InventoryView; label: string }[] = [
    { view: 'low', label: 'Low' },
    { view: 'out', label: 'Out' },
    { view: 'all', label: 'All' },
  ];

  function tabCount(which: InventoryView): number {
    return which === 'low' ? counts.low : which === 'out' ? counts.out : counts.active;
  }

  async function changeStock(product: Product, change: number) {
    try {
      await adjustStock(product.id, change);
    } catch (error) {
      showToast(describeError(error), 'error');
    }
  }
</script>

<TopBar title="Inventory" />

<div class="content">
  <div class="tabs" role="tablist" aria-label="Stock lists">
    {#each tabs as tab (tab.view)}
      <button
        type="button"
        role="tab"
        class="tab tab-{tab.view}"
        class:selected={view === tab.view}
        aria-selected={view === tab.view}
        onclick={() => showView(tab.view)}
      >
        {tab.label}
        <span class="tab-count">{products ? tabCount(tab.view) : '…'}</span>
      </button>
    {/each}
  </div>

  {#if errorMessage}
    <div class="card error" role="alert">
      <strong>Can't load your stock.</strong>
      <p>{errorMessage}</p>
      <button type="button" class="btn btn-secondary" onclick={load}>Try again</button>
    </div>
  {:else if products === null}
    <p class="muted center" aria-busy="true">Loading stock…</p>
  {:else if rows.length === 0}
    {#if counts.active === 0}
      <EmptyState icon="products" title="No products yet" text="Add products to start tracking your stock.">
        <a class="btn btn-primary" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())}>
          <Icon name="plus" /> Add product
        </a>
      </EmptyState>
    {:else}
      <EmptyState
        icon="check"
        tone="good"
        title={view === 'low' ? 'Nothing is running low' : 'Nothing is out of stock'}
        text="Good job keeping the shelves full."
      />
    {/if}
  {:else}
    {#if view !== 'all'}
      <p class="muted note">Tap +1 after restocking, or Set to enter an exact count.</p>
    {/if}
    <ul class="list-card">
      {#each rows as product (product.id)}
        <li class="row">
          <a class="info" href={`#${paths.productDetail(product.id)}`} onclick={linkTo(paths.productDetail(product.id))}>
            <span class="name">{product.name}</span>
            <span class="meta">
              {formatQuantity(product.stockQuantity, product.unit)}
              {#if product.lowStockThreshold > 0}· alert at {product.lowStockThreshold}{/if}
            </span>
          </a>
          <span class="status">
            {#if view !== 'all' && stockStatus(product) === 'ok'}
              <span class="badge badge-ok"><Icon name="check" size={14} /> Restocked</span>
            {:else}
              <StockBadge {product} />
            {/if}
          </span>
          <div class="actions" role="group" aria-label={`Stock for ${product.name}`}>
            <button
              type="button"
              class="btn btn-secondary"
              aria-label={`Remove 1 from ${product.name}`}
              disabled={product.stockQuantity === 0}
              onclick={() => changeStock(product, -1)}>−1</button
            >
            <button
              type="button"
              class="btn btn-secondary"
              aria-label={`Add 1 to ${product.name}`}
              onclick={() => changeStock(product, 1)}>+1</button
            >
            <button
              type="button"
              class="btn btn-primary"
              aria-label={`Set stock for ${product.name}`}
              onclick={() => (settingStockFor = product)}>Set…</button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if settingStockFor}
  <SetStockDialog product={settingStockFor} onClose={() => (settingStockFor = null)} />
{/if}

<style>
  .center {
    text-align: center;
  }

  .tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-1);
    padding: var(--space-1);
    background: var(--color-border);
    border-radius: var(--radius-md);
  }

  .tab {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-on-grey);
    font-weight: 700;
    cursor: pointer;
  }

  .tab.selected {
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }

  .tab-count {
    min-width: 26px;
    padding: 0 var(--space-2);
    border-radius: 999px;
    background: var(--color-bg);
    font-size: var(--text-xs);
    line-height: 20px;
  }

  .tab-low.selected .tab-count {
    background: var(--color-low-bg);
    color: var(--color-low-text);
  }

  .tab-out.selected .tab-count {
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error p {
    margin: var(--space-1) 0 var(--space-3);
  }

  .note {
    margin: 0;
    font-size: var(--text-sm);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-3) var(--space-4);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    color: inherit;
    text-decoration: none;
  }

  .name {
    font-weight: 700;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .meta {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .status {
    text-align: right;
  }

  /* −1 | +1 | Set… joined into one compact group. */
  .actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
  }

  .actions .btn {
    min-height: 44px;
    border-radius: 0;
    font-size: var(--text-md);
    box-shadow: none;
  }

  .actions .btn:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  .actions .btn + .btn {
    margin-left: -1.5px;
  }

  .actions .btn:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
</style>
