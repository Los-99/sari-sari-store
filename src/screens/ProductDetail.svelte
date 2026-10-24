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

<TopBar title={product?.name ?? 'Product'} backTo={paths.products}>
  {#snippet actions()}
    {#if product}
      <a class="btn edit" href={`#${paths.productEdit(product.id)}`} onclick={linkTo(paths.productEdit(product.id))}>
        Edit
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

    <section class="card">
      {#if photo}
        <div class="photo"><PhotoView image={photo.image} alt={`Photo of ${product.name}`} size="fill" fit="contain" /></div>
      {/if}
      <h2 class="name">{product.name}</h2>
      <div class="prices">
        <div>
          <span class="label">Selling price</span>
          <span class="big">{formatPeso(product.sellingPriceCentavos)}</span>
        </div>
        <div>
          <span class="label">Cost price</span>
          <span class="big muted-value">{formatPeso(product.costPriceCentavos)}</span>
        </div>
      </div>
      <p class="profit" class:loss={profit < 0}>
        {profit < 0 ? 'Loss' : 'Profit'} per {product.unit}: <strong>{formatPeso(Math.abs(profit))}</strong>
      </p>
    </section>

    <section class="card">
      <div class="stock-head">
        <div>
          <span class="label">Stock</span>
          <span class="big">{formatQuantity(product.stockQuantity, product.unit)}</span>
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

    <section class="card">
      <dl class="facts">
        <div><dt>Barcode</dt><dd class="barcode">{product.barcode ?? 'None'}</dd></div>
        <div><dt>Category</dt><dd>{product.category}</dd></div>
        <div><dt>Unit</dt><dd>{product.unit}</dd></div>
        <div><dt>Added</dt><dd>{formatDateTime(product.createdAt)}</dd></div>
        <div><dt>Last updated</dt><dd>{formatDateTime(product.updatedAt)}</dd></div>
      </dl>
    </section>

    {#if product.isActive}
      <button type="button" class="btn btn-block deactivate" onclick={deactivate}>
        <Icon name="out" size={20} /> Deactivate product
      </button>
    {/if}
  {/if}
</div>

{#if settingStock && product}
  <SetStockDialog {product} onClose={() => (settingStock = false)} />
{/if}

<style>
  .edit {
    color: var(--color-on-primary);
  }

  .error {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error p {
    margin: var(--space-1) 0 var(--space-3);
  }

  .inactive {
    background: var(--color-border);
  }

  .inactive p {
    margin: 0 0 var(--space-3);
  }

  .photo {
    margin-bottom: var(--space-3);
  }

  .name {
    font-size: var(--text-xl);
    overflow-wrap: anywhere;
  }

  .label {
    display: block;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .big {
    font-size: var(--text-xl);
    font-weight: 800;
  }

  .muted-value {
    color: var(--color-text-muted);
  }

  .prices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }

  .profit {
    margin: var(--space-3) 0 0;
    color: var(--color-ok-text);
  }

  .profit.loss {
    color: var(--color-danger);
  }

  .stock-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
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
    padding: var(--space-2) 0;
  }

  .facts div + div {
    border-top: 1px solid var(--color-border);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .barcode {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    letter-spacing: 0.04em;
  }

  .deactivate {
    border-color: var(--color-danger);
    color: var(--color-danger);
    background: var(--color-surface);
  }
</style>
