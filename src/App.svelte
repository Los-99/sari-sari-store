<script lang="ts">
  import BottomNav from './components/BottomNav.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import ToastHost from './components/ToastHost.svelte';
  import DialogHost from './components/DialogHost.svelte';
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
  <!-- Each visit to a screen starts it fresh. Typing a search (which only
       updates the address) does not count as a new visit. -->
  {#key router.visit}
    {#if route.name === 'dashboard'}
      <Dashboard />
    {:else if route.name === 'products'}
      <ProductList initialQuery={route.query} />
    {:else if route.name === 'product-new'}
      <ProductForm barcode={route.barcode} />
    {:else if route.name === 'product-detail'}
      <ProductDetail productId={route.id} />
    {:else if route.name === 'product-edit'}
      <ProductForm productId={route.id} />
    {:else if route.name === 'scan'}
      <Scanner />
    {:else if route.name === 'inventory'}
      <Inventory initialView={route.view} />
    {:else if route.name === 'settings'}
      <Settings />
    {:else}
      <NotFound />
    {/if}
  {/key}
</main>

<!-- Messages sit just above the bottom navigation, newest at the bottom. -->
<div class="bottom-stack">
  <ToastHost />
  <UpdateBanner />
</div>
<BottomNav active={tabFor(route)} />
<DialogHost />

<style>
  .bottom-stack {
    position: fixed;
    left: var(--space-3);
    right: var(--space-3);
    bottom: calc(
      var(--bottom-nav-height) + env(safe-area-inset-bottom) + var(--action-bar-height) + var(--space-3)
    );
    z-index: 30;
    max-width: calc(var(--content-max-width) - 2 * var(--space-3));
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    pointer-events: none;
  }

  .bottom-stack > :global(*) {
    pointer-events: auto;
  }

  .screen {
    min-height: 100dvh;
    /* Leave room so the bottom navigation never covers content. */
    padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + var(--space-6));
  }
</style>
