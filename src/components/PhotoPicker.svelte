<script lang="ts">
  import Icon from './Icon.svelte';
  import PhotoView from './PhotoView.svelte';
  import type { PhotoImage } from '../lib/model/photo';
  import { PhotoError, preparePhoto } from '../lib/photos/process';

  // Take a photo with the camera, or choose one from the gallery.
  let {
    image,
    onPicked,
    onRemove,
  }: {
    /** The photo to show now, or null for none. */
    image: PhotoImage | null;
    onPicked: (photo: { full: PhotoImage; thumb: PhotoImage }) => void;
    onRemove: () => void;
  } = $props();

  let cameraInput: HTMLInputElement | undefined = $state();
  let galleryInput: HTMLInputElement | undefined = $state();
  let busy = $state(false);
  let error = $state('');

  async function picked(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // Allows picking the same picture again.
    if (!file) return;
    busy = true;
    error = '';
    try {
      onPicked(await preparePhoto(file));
    } catch (failure) {
      error = failure instanceof PhotoError ? failure.message : "This picture couldn't be used. Try another photo.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="picker">
  <PhotoView {image} alt="Product photo" size={96} />
  <div class="actions">
    <!-- capture="environment" opens the back camera directly. -->
    <input
      bind:this={cameraInput}
      type="file"
      accept="image/*"
      capture="environment"
      class="visually-hidden"
      tabindex="-1"
      aria-hidden="true"
      onchange={picked}
    />
    <input
      bind:this={galleryInput}
      type="file"
      accept="image/*"
      class="visually-hidden"
      tabindex="-1"
      aria-hidden="true"
      onchange={picked}
    />
    <button type="button" class="btn btn-secondary" disabled={busy} onclick={() => cameraInput?.click()}>
      <Icon name="camera" /> {image ? 'Retake photo' : 'Take photo'}
    </button>
    <button type="button" class="btn btn-secondary" disabled={busy} onclick={() => galleryInput?.click()}>
      <Icon name="image" /> Choose photo
    </button>
    {#if image && !busy}
      <button type="button" class="link-button" onclick={onRemove}>Remove photo</button>
    {/if}
    {#if busy}<p class="muted small" aria-busy="true">Preparing photo…</p>{/if}
  </div>
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}

<style>
  .picker {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
  }

  .actions {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .actions .btn {
    justify-content: flex-start;
    padding: 0 var(--space-3);
    text-align: left;
    line-height: 1.2;
  }

  /* Keep icons full size even when the label is long. */
  .actions .btn :global(svg) {
    flex: none;
  }

  .link-button {
    align-self: flex-start;
    min-height: 40px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-danger);
    font-weight: 700;
    cursor: pointer;
  }

  .small {
    margin: 0;
    font-size: var(--text-sm);
  }

  .error {
    margin: 0;
    color: var(--color-danger);
    font-weight: 600;
    font-size: var(--text-sm);
  }
</style>
