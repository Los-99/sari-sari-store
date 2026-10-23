<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
</script>

<TopBar title="Inventory" />

<div class="content">
  <ComingSoon phase={5} description="Low-stock and out-of-stock lists, with quick stock adjustment." />
</div>
