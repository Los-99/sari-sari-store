<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';
  import { linkTo } from '../lib/router.svelte';
  import { paths, type Tab } from '../lib/routes';

  let { active }: { active: Tab | null } = $props();

  const tabs: { tab: Tab; label: string; icon: IconName; path: string }[] = [
    { tab: 'home', label: 'Home', icon: 'home', path: paths.dashboard },
    { tab: 'products', label: 'Products', icon: 'products', path: paths.products },
    { tab: 'scan', label: 'Scan', icon: 'scan', path: paths.scan },
    { tab: 'inventory', label: 'Inventory', icon: 'inventory', path: paths.inventory },
    { tab: 'settings', label: 'Settings', icon: 'settings', path: paths.settings },
  ];
</script>

<nav class="bottom-nav" aria-label="Main">
  <ul>
    {#each tabs as item (item.tab)}
      <li>
        <a
          href={`#${item.path}`}
          class:active={active === item.tab}
          class:scan={item.tab === 'scan'}
          aria-current={active === item.tab ? 'page' : undefined}
          onclick={linkTo(item.path)}
        >
          <span class="icon"><Icon name={item.icon} size={item.tab === 'scan' ? 28 : 24} /></span>
          <span class="label">{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    background: rgb(255 255 255 / 0.97);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -2px 12px rgb(16 24 20 / 0.06);
    padding-bottom: env(safe-area-inset-bottom);
    backdrop-filter: saturate(1.4) blur(8px);
    -webkit-backdrop-filter: saturate(1.4) blur(8px);
  }

  ul {
    list-style: none;
    margin: 0 auto;
    padding: 0;
    max-width: var(--content-max-width);
    height: var(--bottom-nav-height);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
  }

  a {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
  }

  a.active {
    color: var(--color-primary);
    font-weight: 800;
  }

  a.active .icon {
    background: var(--color-primary-soft);
  }

  .icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 30px;
    border-radius: 999px;
  }

  /* The Scan tab is a large raised button in the middle. */
  a.scan .icon {
    width: 60px;
    height: 60px;
    margin-top: -26px;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-on-primary);
    box-shadow: var(--shadow-raised);
    border: 4px solid var(--color-surface);
  }

  a.scan.active .icon {
    background: var(--color-primary-strong);
  }
</style>
