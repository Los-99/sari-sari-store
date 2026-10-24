<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import StockBadge from '../components/StockBadge.svelte';
  import BarcodeScanner from '../components/BarcodeScanner.svelte';
  import BarcodeEntryDialog from '../components/BarcodeEntryDialog.svelte';
  import SetStockDialog from '../components/SetStockDialog.svelte';
  import { navigate } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import PhotoView from '../components/PhotoView.svelte';
  import { findProductByBarcode, getPhotoThumb, productChanges, setProductActive } from '../lib/db/products';
  import type { PhotoImage } from '../lib/model/photo';
  import { describeError } from '../lib/db/errors';
  import { showToast } from '../lib/toast.svelte';
  import type { Product } from '../lib/model/product';
  import { formatPeso } from '../lib/util/money';
  import { formatQuantity } from '../lib/util/format';

  /**
   * After a scan, the camera pauses and shows what was found:
   * - a known product (with quick actions), or
   * - an unknown barcode (with "Register new product").
   */
  type Result =
    | { kind: 'looking'; code: string }
    | { kind: 'found'; code: string; product: Product; thumb?: PhotoImage }
    | { kind: 'unknown'; code: string }
    | { kind: 'error'; code: string; message: string };

  let result = $state<Result | null>(null);
  let typing = $state(false);
  let settingStock = $state(false);

  async function lookUp(code: string) {
    result = { kind: 'looking', code };
    if (storage.status === 'error') {
      result = { kind: 'error', code, message: storage.errorMessage };
      return;
    }
    try {
      const product = await findProductByBarcode(code);
      const thumb = product ? (await getPhotoThumb(product.id))?.image : undefined;
      // Ignore the answer if the user already moved on.
      if (result?.code !== code) return;
      result = product ? { kind: 'found', code, product, thumb } : { kind: 'unknown', code };
    } catch (error) {
      result = { kind: 'error', code, message: describeError(error) };
    }
  }

  function scanNext() {
    result = null;
  }

  // Keep the shown product up to date after "Set stock" or "Reactivate".
  $effect(() => {
    const refresh = () => {
      if (result?.kind === 'found') void lookUp(result.code);
    };
    productChanges.addEventListener('change', refresh);
    return () => productChanges.removeEventListener('change', refresh);
  });

  async function reactivate(product: Product) {
    try {
      await setProductActive(product.id, true);
      showToast('Product reactivated.');
    } catch (error) {
      showToast(describeError(error), 'error');
    }
  }
</script>

<TopBar title="Scan Barcode" />

<div class="page">
  <!-- The result slides up over the bottom of the camera view, like a sheet. -->
  <div class="stage">
  <div class="camera">
    <BarcodeScanner paused={result !== null || typing} onDetected={lookUp} />
  </div>

  {#if result}
    <section class="result" aria-live="polite">
      <span class="handle" aria-hidden="true"></span>
      <p class="code"><span class="muted">Barcode</span> <strong>{result.code}</strong></p>

      {#if result.kind === 'looking'}
        <p class="muted">Looking up…</p>
      {:else if result.kind === 'error'}
        <p class="problem">{result.message}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" onclick={scanNext}>Scan again</button>
        </div>
      {:else if result.kind === 'unknown'}
        <h2>Not in your products yet</h2>
        <p class="muted">Register it now. You'll type the name and prices yourself.</p>
        <div class="actions">
          <button
            type="button"
            class="btn btn-primary"
            onclick={() => navigate(paths.productNew(result?.code))}
          >
            <Icon name="plus" /> Register new product
          </button>
          <button type="button" class="btn btn-secondary" onclick={scanNext}>Scan again</button>
        </div>
      {:else}
        {@const product = result.product}
        <div class="product">
          <PhotoView image={result.thumb} alt={`Photo of ${product.name}`} size={64} />
          <h2>{product.name}</h2>
          <span class="price">{formatPeso(product.sellingPriceCentavos)}</span>
        </div>
        {#if product.isActive}
          <p class="stock">
            <span>Stock: {formatQuantity(product.stockQuantity, product.unit)}</span>
            <StockBadge {product} />
          </p>
          <div class="actions three">
            <button type="button" class="btn btn-secondary" onclick={() => navigate(paths.productDetail(product.id))}>
              View
            </button>
            <button type="button" class="btn btn-secondary" onclick={() => (settingStock = true)}>Set stock</button>
            <button type="button" class="btn btn-primary" onclick={scanNext}>Scan next</button>
          </div>
        {:else}
          <p class="problem">This product is deactivated.</p>
          <div class="actions three">
            <button type="button" class="btn btn-secondary" onclick={() => navigate(paths.productDetail(product.id))}>
              View
            </button>
            <button type="button" class="btn btn-secondary" onclick={() => reactivate(product)}>Reactivate</button>
            <button type="button" class="btn btn-primary" onclick={scanNext}>Scan next</button>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
  </div>
  <button type="button" class="btn btn-secondary manual" disabled={result !== null} onclick={() => (typing = true)}>
    <Icon name="keyboard" /> Enter barcode manually
  </button>
</div>

{#if typing}
  <BarcodeEntryDialog
    onSubmit={(code) => {
      typing = false;
      void lookUp(code);
    }}
    onClose={() => (typing = false)}
  />
{/if}

{#if settingStock && result?.kind === 'found'}
  <SetStockDialog product={result.product} onClose={() => (settingStock = false)} />
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding-bottom: var(--space-3);
  }

  .stage {
    position: relative;
  }

  /* The camera fills the screen above the "Enter barcode manually" button. */
  .camera {
    height: calc(
      100dvh - var(--top-bar-height) - env(safe-area-inset-top) - var(--bottom-nav-height) -
        env(safe-area-inset-bottom) - 84px
    );
    min-height: 420px;
  }

  .manual {
    margin: 0 var(--space-4);
  }

  .result {
    position: absolute;
    left: var(--space-2);
    right: var(--space-2);
    bottom: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-lg);
    animation: slide-up 180ms ease-out;
  }

  @keyframes slide-up {
    from {
      transform: translateY(24px);
    }
  }

  .handle {
    align-self: center;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-border);
  }

  .result p {
    margin: 0;
  }

  .code {
    font-size: var(--text-sm);
  }

  .code strong {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    letter-spacing: 0.04em;
  }

  .result h2 {
    font-size: var(--text-lg);
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .product {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .product h2 {
    flex: 1;
    min-width: 0;
  }

  .price {
    font-size: var(--text-xl);
    font-weight: 800;
    color: var(--color-primary);
    white-space: nowrap;
  }

  .stock {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .problem {
    color: var(--color-danger);
    font-weight: 600;
  }

  .actions {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .actions.three {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .actions.three .btn {
    padding: 0 var(--space-2);
    font-size: var(--text-sm);
    line-height: 1.2;
  }
</style>
