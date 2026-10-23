<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { navigate } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
</script>

<TopBar title="Page not found" />

<div class="content">
  <div class="card">
    <p>This page doesn't exist.</p>
    <button type="button" class="btn btn-primary btn-block" onclick={() => navigate(paths.dashboard, { replace: true })}>
      Go to Home
    </button>
  </div>
</div>

<style>
  p {
    margin: 0 0 var(--space-4);
  }
</style>
