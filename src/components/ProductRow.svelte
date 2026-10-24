<script lang="ts">
  import StockBadge from './StockBadge.svelte';
  import PhotoView from './PhotoView.svelte';
  import type { Product } from '../lib/model/product';
  import type { PhotoImage } from '../lib/model/photo';
  import { formatPeso } from '../lib/util/money';
  import { linkTo } from '../lib/router.svelte';
  import { paths } from '../lib/routes';

  let { product, thumb }: { product: Product; thumb?: PhotoImage } = $props();

  const path = $derived(paths.productDetail(product.id));
</script>

<a class="row" class:inactive={!product.isActive} href={`#${path}`} onclick={linkTo(path)}>
  <span class="thumb"><PhotoView image={thumb} alt="" size={52} /></span>
  <span class="name">{product.name}</span>
  <span class="price">{formatPeso(product.sellingPriceCentavos)}</span>
  <span class="meta">{product.category} · {product.unit}</span>
  <span class="status">
    {#if product.isActive}
      <StockBadge {product} />
    {:else}
      <span class="badge inactive-badge">INACTIVE</span>
    {/if}
  </span>
</a>

<style>
  .row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-1) var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4) var(--space-3) var(--space-3);
    min-height: 64px;
    color: inherit;
    text-decoration: none;
    background: var(--color-surface);
  }

  .row:active {
    background: var(--color-primary-soft);
  }

  .thumb {
    grid-row: span 2;
  }

  .name {
    font-weight: 700;
    overflow-wrap: anywhere;
    align-self: end;
  }

  .price {
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
    align-self: end;
  }

  .meta {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    overflow-wrap: anywhere;
    align-self: start;
  }

  .status {
    text-align: right;
    align-self: start;
  }

  .inactive .name,
  .inactive .price {
    color: var(--color-text-muted);
  }

  .inactive .thumb {
    opacity: 0.5;
  }

  .inactive-badge {
    background: var(--color-border);
    color: var(--color-text-on-grey);
  }
</style>
