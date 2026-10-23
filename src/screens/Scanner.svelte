<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ComingSoon from '../components/ComingSoon.svelte';
</script>

<TopBar title="Scan Barcode" />

<div class="content">
  <ComingSoon
    phase={6}
    description="Camera barcode scanner, with manual barcode entry and flashlight (where supported)."
  />
</div>
