<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
  import { linkTo } from '../lib/router.svelte';
  import { paths } from '../lib/routes';

  let { productId }: { productId: number } = $props();
</script>

<TopBar title="Product Details" backTo={paths.products}>
  {#snippet actions()}
    <a class="btn edit" href={`#${paths.productEdit(productId)}`} onclick={linkTo(paths.productEdit(productId))}>
      Edit
    </a>
  {/snippet}
</TopBar>

<div class="content">
  <ComingSoon phase={4} description={`Prices, stock and details for product #${productId}.`} />
</div>

<style>
  .edit {
    color: var(--color-on-primary);
  }
</style>
