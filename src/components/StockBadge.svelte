<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Product } from '../lib/model/product';
  import { stockStatus } from '../lib/util/stock';

  let { product }: { product: Pick<Product, 'stockQuantity' | 'lowStockThreshold'> } = $props();

  const status = $derived(stockStatus(product));
</script>

{#if status === 'out'}
  <span class="badge badge-out"><Icon name="out" size={14} /> OUT</span>
{:else if status === 'low'}
  <span class="badge badge-low"><Icon name="alert" size={14} /> LOW · {product.stockQuantity} left</span>
{:else}
  <span class="badge badge-ok">{product.stockQuantity.toLocaleString('en-PH')} in stock</span>
{/if}
