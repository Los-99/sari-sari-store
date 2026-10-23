<script lang="ts">
  // Temporary placeholder shown on screens that are built in later phases.
  let { phase, description }: { phase: number; description: string } = $props();
</script>

<div class="card coming-soon">
  <p class="phase">Coming in Phase {phase}</p>
  <p class="muted">{description}</p>
</div>

<style>
  .coming-soon {
    border-style: dashed;
    text-align: center;
  }

  p {
    margin: 0;
  }

  .phase {
    font-weight: 700;
    margin-bottom: var(--space-1);
  }
</style>
