<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import StockBadge from '../components/StockBadge.svelte';
  import SetStockDialog from '../components/SetStockDialog.svelte';
  import { linkTo, navigate } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import PhotoView from '../components/PhotoView.svelte';
  import { adjustStock, getPhoto, getProduct, productChanges, setProductActive } from '../lib/db/products';
  import type { StoredPhoto } from '../lib/db/database';
  import { describeError } from '../lib/db/errors';
  import { confirmDialog } from '../lib/dialog.svelte';
  import { showToast } from '../lib/toast.svelte';
  import type { Product } from '../lib/model/product';
  import { formatPeso } from '../lib/util/money';
  import { formatDateTime, formatQuantity } from '../lib/util/format';

  let { productId }: { productId: number } = $props();

  /** undefined = still loading, null = no product with this id. */
  let product = $state<Product | null | undefined>(undefined);
  let loadError = $state('');
  let settingStock = $state(false);

  /** The product's photo; replaced only when the photo itself changes (not on every stock tap). */
  let photo = $state.raw<StoredPhoto | null>(null);

  async function load() {
    try {
      const [found, stored] = await Promise.all([getProduct(productId), getPhoto(productId)]);
      product = found ?? null;
      if (stored?.updatedAt !== photo?.updatedAt) photo = stored ?? null;
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

  const profit = $derived(product ? product.sellingPriceCentavos - product.costPriceCentavos : 0);

  async function changeStock(change: number) {
    if (!product) return;
    try {
      await adjustStock(product.id, change);
    } catch (error) {
      showToast(describeError(error), 'error');
    }
  }

  async function deactivate() {
    if (!product) return;
    const confirmed = await confirmDialog({
      title: `Deactivate ${product.name}?`,
      message: 'It will be hidden from your product list and stock counts.',
      details: [
        'Nothing is deleted. You can reactivate it at any time.',
        product.barcode ? 'Its barcode stays reserved for this product.' : '',
      ].filter(Boolean),
      confirmLabel: 'Deactivate',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await setProductActive(product.id, false);
      showToast('Product deactivated.');
    } catch (error) {
      showToast(describeError(error), 'error');
    }
  }

  async function reactivate() {
    if (!product) return;
    try {
      await setProductActive(product.id, true);
      showToast('Product reactivated.');
    } catch (error) {
      showToast(describeError(error), 'error');
    }
  }
</script>

<!-- The name is shown big on the page, so the bar only keeps it for screen readers. -->
<TopBar title={product?.name ?? 'Product'} showTitle={false} backTo={paths.products}>
  {#snippet actions()}
    {#if product}
      <a class="btn" href={`#${paths.productEdit(product.id)}`} onclick={linkTo(paths.productEdit(product.id))}>
        <Icon name="edit" size={18} /> Edit
      </a>
    {/if}
  {/snippet}
</TopBar>

<div class="content">
  {#if loadError || storage.status === 'error'}
    <div class="card error" role="alert">
      <strong>Can't load this product.</strong>
      <p>{loadError || storage.errorMessage}</p>
      <button type="button" class="btn btn-secondary" onclick={load}>Try again</button>
    </div>
  {:else if product === undefined}
    <p class="muted" aria-busy="true">Loading…</p>
  {:else if product === null}
    <div class="card">
      <p>This product doesn't exist.</p>
      <button type="button" class="btn btn-primary btn-block" onclick={() => navigate(paths.products, { replace: true })}>
        Go to Products
      </button>
    </div>
  {:else}
    {#if !product.isActive}
      <div class="card inactive" role="status">
        <p><strong>This product is deactivated.</strong> It's hidden from your list and stock counts.</p>
        <button type="button" class="btn btn-primary btn-block" onclick={reactivate}>Reactivate</button>
      </div>
    {/if}

    {#if photo}
      <PhotoView image={photo.image} alt={`Photo of ${product.name}`} size="fill" fit="contain" />
    {/if}

    <section class="headline">
      <h2 class="name">{product.name}</h2>
      <p class="muted sub">{product.category} · {product.unit}</p>
    </section>

    <section class="card price-card" aria-label="Prices">
      <div class="price-main">
        <span class="label">Selling price</span>
        <span class="selling">{formatPeso(product.sellingPriceCentavos)}</span>
      </div>
      <span class="profit-pill" class:loss={profit < 0}>
        {profit < 0 ? 'Loss' : 'Profit'}
        {formatPeso(Math.abs(profit))}
      </span>
      <p class="cost">Cost {formatPeso(product.costPriceCentavos)} per {product.unit}</p>
    </section>

    <section class="card" aria-label="Stock">
      <div class="stock-head">
        <div>
          <span class="label">Stock</span>
          <span class="stock">{formatQuantity(product.stockQuantity, product.unit)}</span>
        </div>
        <StockBadge {product} />
      </div>
      <p class="muted alert-note">
        {product.lowStockThreshold > 0
          ? `Low-stock alert at ${formatQuantity(product.lowStockThreshold, product.unit)} or fewer`
          : 'Low-stock alert is off'}
      </p>
      <div class="stock-buttons">
        <button
          type="button"
          class="btn btn-secondary"
          aria-label="Remove 1 from stock"
          disabled={product.stockQuantity === 0}
          onclick={() => changeStock(-1)}>−1</button
        >
        <button type="button" class="btn btn-secondary" aria-label="Add 1 to stock" onclick={() => changeStock(1)}
          >+1</button
        >
        <button type="button" class="btn btn-primary" onclick={() => (settingStock = true)}>Set…</button>
      </div>
    </section>

    <h3 class="section-title">Details</h3>
    <dl class="list-card facts">
      <div><dt>Barcode</dt><dd class="barcode">{product.barcode ?? 'None'}</dd></div>
      <div><dt>Category</dt><dd>{product.category}</dd></div>
      <div><dt>Unit</dt><dd>{product.unit}</dd></div>
      <div><dt>Added</dt><dd>{formatDateTime(product.createdAt)}</dd></div>
      <div><dt>Last updated</dt><dd>{formatDateTime(product.updatedAt)}</dd></div>
    </dl>

    {#if product.isActive}
      <button type="button" class="btn btn-block btn-danger" onclick={deactivate}>
        <Icon name="out" size={20} /> Deactivate product
      </button>
    {/if}
  {/if}
</div>

{#if settingStock && product}
  <SetStockDialog {product} onClose={() => (settingStock = false)} />
{/if}

<style>
  .error {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error p {
    margin: var(--space-1) 0 var(--space-3);
  }

  .inactive {
    background: var(--color-surface-sunken);
  }

  .inactive p {
    margin: 0 0 var(--space-3);
  }

  .headline {
    margin-bottom: calc(-1 * var(--space-2));
  }

  .name {
    font-size: var(--text-xl);
    font-weight: 800;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }

  .sub {
    margin: 2px 0 0;
  }

  .label {
    display: block;
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .price-card {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--space-1) var(--space-3);
  }

  .selling {
    font-size: var(--text-2xl);
    font-weight: 800;
    color: var(--color-primary);
    line-height: 1.15;
  }

  .profit-pill {
    padding: var(--space-1) var(--space-3);
    border-radius: 999px;
    background: var(--color-ok-bg);
    color: var(--color-ok-text);
    font-size: var(--text-sm);
    font-weight: 750;
    white-space: nowrap;
  }

  .profit-pill.loss {
    background: var(--color-out-bg);
    color: var(--color-danger);
  }

  .cost {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .stock-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .stock {
    font-size: var(--text-xl);
    font-weight: 800;
  }

  .alert-note {
    margin: var(--space-1) 0 var(--space-3);
    font-size: var(--text-sm);
  }

  .stock-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-2);
  }

  .stock-buttons .btn {
    font-size: var(--text-lg);
  }

  .facts {
    margin: 0;
  }

  .facts div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
  }

  .facts div + div {
    border-top: 1px solid var(--color-border);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-weight: 650;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .barcode {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    letter-spacing: 0.04em;
  }
</style>
