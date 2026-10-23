<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
  import { paths } from '../lib/routes';

  // One form for both adding and editing.
  let {
    productId,
    barcode,
  }: {
    /** Set when editing an existing product. */
    productId?: number;
    /** Pre-filled barcode when coming from the scanner. */
    barcode?: string;
  } = $props();

  const isEdit = $derived(productId !== undefined);
</script>

<TopBar
  title={isEdit ? 'Edit Product' : 'Add Product'}
  backTo={productId !== undefined ? paths.productDetail(productId) : paths.products}
/>

<div class="content">
  {#if barcode}
    <div class="card">
      <span class="muted">Barcode from scanner:</span> <strong>{barcode}</strong>
    </div>
  {/if}
  <ComingSoon
    phase={4}
    description={isEdit
      ? `The form for editing product #${productId}.`
      : 'The form for registering a new product.'}
  />
</div>
