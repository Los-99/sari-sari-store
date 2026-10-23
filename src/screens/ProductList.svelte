<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
  import { linkTo } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
</script>

<TopBar title="Products" />

<div class="content">
  <ComingSoon phase={4} description="Your product list, with search, category filter and sorting (Phase 5)." />
</div>

<a class="fab" href={`#${paths.productNew()}`} onclick={linkTo(paths.productNew())} aria-label="Add product">
  <Icon name="plus" size={28} />
</a>

<style>
  .fab {
    position: fixed;
    right: var(--space-4);
    bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + var(--space-4));
    z-index: 15;
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-lg);
    background: var(--color-primary);
    color: var(--color-on-primary);
    box-shadow: var(--shadow-raised);
  }
</style>
