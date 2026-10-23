<script lang="ts">
  import BottomNav from './components/BottomNav.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import Dashboard from './screens/Dashboard.svelte';
  import ProductList from './screens/ProductList.svelte';
  import ProductForm from './screens/ProductForm.svelte';
  import ProductDetail from './screens/ProductDetail.svelte';
  import Scanner from './screens/Scanner.svelte';
  import Inventory from './screens/Inventory.svelte';
  import Settings from './screens/Settings.svelte';
  import NotFound from './screens/NotFound.svelte';
  import { router } from './lib/router.svelte';
  import { tabFor } from './lib/routes';

  const route = $derived(router.route);
</script>

<main class="screen">
  {#if route.name === 'dashboard'}
    <Dashboard />
  {:else if route.name === 'products'}
    <ProductList />
  {:else if route.name === 'product-new'}
    <ProductForm barcode={route.barcode} />
  {:else if route.name === 'product-detail'}
    {#key route.id}<ProductDetail productId={route.id} />{/key}
  {:else if route.name === 'product-edit'}
    {#key route.id}<ProductForm productId={route.id} />{/key}
  {:else if route.name === 'scan'}
    <Scanner />
  {:else if route.name === 'inventory'}
    <Inventory />
  {:else if route.name === 'settings'}
    <Settings />
  {:else}
    <NotFound />
  {/if}
</main>

<UpdateBanner />
<BottomNav active={tabFor(route)} />

<style>
  .screen {
    min-height: 100dvh;
    /* Leave room so the bottom navigation never covers content. */
    padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + var(--space-6));
  }
</style>
