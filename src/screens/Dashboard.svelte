<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import PhotoView from '../components/PhotoView.svelte';
  import StockBadge from '../components/StockBadge.svelte';
  import BackupReminder from '../components/BackupReminder.svelte';
  import { linkTo } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import { listPhotoThumbs, listProducts, productChanges } from '../lib/db/products';
  import { describeError } from '../lib/db/errors';
  import type { Product } from '../lib/model/product';
  import type { PhotoImage } from '../lib/model/photo';
  import { stockStatus, summarizeStock } from '../lib/util/stock';

  let products = $state.raw<Product[] | null>(null);
  let thumbs = $state.raw<Map<number, PhotoImage>>(new Map());
  let loadError = $state('');

  async function load() {
    try {
      const [all, pictures] = await Promise.all([listProducts(), listPhotoThumbs()]);
      thumbs = pictures;
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

  const summary = $derived(products ? summarizeStock(products) : null);

  /** Out-of-stock first, then the lowest stock. Only active products. */
  const needsRestock = $derived(
    (products ?? [])
      .filter((product) => product.isActive && stockStatus(product) !== 'ok')
      .sort(
        (a, b) =>
          a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name, 'en-PH', { sensitivity: 'base' }),
      ),
  );
  const restockPath = $derived(
    summary && summary.low === 0 && summary.out > 0 ? paths.inventoryView('out') : paths.inventoryView('low'),
  );

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
  const errorMessage = $derived(storage.status === 'error' ? storage.errorMessage : loadError);
</script>

<header class="hero">
  <div class="hero-inner">
    <p class="date">{today}</p>
    <h1>Sari-Sari Store</h1>

    <section class="stats" aria-label="Stock summary" aria-busy={summary === null}>
      <a class="stat" href={`#${paths.products}`} onclick={linkTo(paths.products)}>
        <span class="value">{summary?.active ?? '…'}</span>
        <span class="label">Products</span>
      </a>
      <a class="stat low" href={`#${paths.inventoryView('low')}`} onclick={linkTo(paths.inventoryView('low'))}>
        <span class="value">{summary?.low ?? '…'}</span>
        <span class="label"><Icon name="alert" size={14} /> Low stock</span>
      </a>
      <a class="stat out" href={`#${paths.inventoryView('out')}`} onclick={linkTo(paths.inventoryView('out'))}>
        <span class="value">{summary?.out ?? '…'}</span>
        <span class="label"><Icon name="out" size={14} /> Out</span>
      </a>
    </section>
  </div>
</header>

<div class="content">
  {#if errorMessage}
    <div class="card error" role="alert">
      <strong>Can't read your products.</strong>
      <p>{errorMessage}</p>
    </div>
  {/if}

  <div class="actions">
    <a class="action primary" href={`#${paths.scan}`} onclick={linkTo(paths.scan)}>
      <span class="action-icon"><Icon name="scan" size={30} /></span>
      <span class="action-text">Scan barcode<small>Check price &amp; stock</small></span>
    </a>
    <a class="action" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())}>
      <span class="action-icon"><Icon name="plus" size={30} /></span>
      <span class="action-text">Add product<small>Register a new item</small></span>
    </a>
  </div>

  {#if products && products.length === 0}
    <div class="card welcome">
      <h2>Welcome! 👋</h2>
      <p>
        Start by adding the products you sell. Scan a barcode to register it, or tap
        <strong>Add product</strong> for items without one.
      </p>
    </div>
  {:else if products}
    <section aria-labelledby="restock-title">
      <div class="section-head">
        <h2 id="restock-title" class="section-title">Needs restocking</h2>
        {#if needsRestock.length > 0}
          <a class="see-all" href={`#${restockPath}`} onclick={linkTo(restockPath)}>See all ({needsRestock.length})</a>
        {/if}
      </div>
      {#if needsRestock.length === 0}
        <p class="card all-good"><Icon name="check" size={20} /> Everything is well stocked.</p>
      {:else}
        <ul class="list-card">
          {#each needsRestock.slice(0, 3) as product (product.id)}
            <li>
              <a
                class="restock-row"
                href={`#${paths.productDetail(product.id)}`}
                onclick={linkTo(paths.productDetail(product.id))}
              >
                <PhotoView image={thumbs.get(product.id)} alt="" size={40} />
                <span class="restock-name">{product.name}</span>
                <StockBadge {product} />
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <BackupReminder hasProducts={(summary?.active ?? 0) > 0} />
</div>

<style>
  .hero {
    background: linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-strong) 100%);
    color: var(--color-on-primary);
    padding-top: env(safe-area-inset-top);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }

  .hero-inner {
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-4);
  }

  .date {
    margin: 0;
    color: var(--color-on-primary-muted);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 2px 0 var(--space-4);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
    box-shadow: var(--shadow-sm);
  }

  .stat:active {
    transform: scale(0.98);
  }

  .value {
    font-size: var(--text-xl);
    font-weight: 800;
    line-height: 1.1;
  }

  .label {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--color-text-muted);
  }

  .stat.low .value,
  .stat.low .label {
    color: var(--color-low-text);
  }

  .stat.out .value,
  .stat.out .label {
    color: var(--color-out-text);
  }

  .error {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error p {
    margin: var(--space-1) 0 0;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .action {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 120px;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    color: var(--color-primary);
    text-decoration: none;
    transition: transform 80ms ease;
  }

  .action:active {
    transform: scale(0.98);
  }

  .action.primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-on-primary);
  }

  .action-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: var(--color-primary-soft);
  }

  .action.primary .action-icon {
    background: rgb(255 255 255 / 0.16);
  }

  .action-text {
    display: flex;
    flex-direction: column;
    font-size: var(--text-md);
    font-weight: 750;
    line-height: 1.25;
  }

  .action-text small {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .action.primary .action-text small {
    color: var(--color-on-primary-muted);
  }

  .welcome h2 {
    font-size: var(--text-lg);
    margin-bottom: var(--space-2);
  }

  .welcome p {
    margin: 0;
    color: var(--color-text-muted);
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .section-head .section-title {
    margin: 0;
  }

  .see-all {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    font-size: var(--text-sm);
    font-weight: 700;
    text-decoration: none;
  }

  .restock-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 60px;
    padding: var(--space-2) var(--space-4) var(--space-2) var(--space-3);
    color: inherit;
    text-decoration: none;
  }

  .restock-row:active {
    background: var(--color-primary-soft);
  }

  .restock-name {
    flex: 1;
    min-width: 0;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .all-good {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    color: var(--color-ok-text);
    font-weight: 650;
  }
</style>
