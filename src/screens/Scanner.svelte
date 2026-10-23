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
  import { findProductByBarcode, productChanges, setProductActive } from '../lib/db/products';
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
    | { kind: 'found'; code: string; product: Product }
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
      // Ignore the answer if the user already moved on.
      if (result?.code !== code) return;
      result = product ? { kind: 'found', code, product } : { kind: 'unknown', code };
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
  <div class="camera" class:compact={result !== null}>
    <BarcodeScanner paused={result !== null || typing} onDetected={lookUp} />
  </div>

  {#if result}
    <section class="result card" aria-live="polite">
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
          <h2>{product.name}</h2>
          <span class="price">{formatPeso(product.sellingPriceCentavos)}</span>
        </div>
        {#if product.isActive}
          <p class="stock">
            {formatQuantity(product.stockQuantity, product.unit)} in stock <StockBadge {product} />
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
  {:else}
    <button type="button" class="btn btn-secondary manual" onclick={() => (typing = true)}>
      <Icon name="keyboard" /> Enter barcode manually
    </button>
  {/if}
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

  /* The camera fills most of the screen above the bottom navigation. */
  .camera {
    height: calc(
      100dvh - var(--top-bar-height) - env(safe-area-inset-top) - var(--bottom-nav-height) -
        env(safe-area-inset-bottom) - 160px
    );
    min-height: 300px;
  }

  .camera.compact {
    height: 32dvh;
    min-height: 200px;
  }

  .manual {
    margin: 0 var(--space-4);
  }

  .result {
    margin: 0 var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .result p {
    margin: 0;
  }

  .code strong {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    letter-spacing: 0.04em;
  }

  .result h2 {
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  .product {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
  }

  .price {
    font-size: var(--text-lg);
    font-weight: 800;
    white-space: nowrap;
  }

  .stock {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
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
</style>
