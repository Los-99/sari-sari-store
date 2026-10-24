<script lang="ts">
  import Icon from './Icon.svelte';
  import { photoBlob, type PhotoImage } from '../lib/model/photo';

  // Shows a stored product photo, or a plain box icon when there is none.
  let {
    image,
    alt,
    size,
    fit = 'cover',
  }: {
    image: PhotoImage | null | undefined;
    alt: string;
    /** Width and height in pixels; 'fill' = full width with a 4:3 shape. */
    size: number | 'fill';
    fit?: 'cover' | 'contain';
  } = $props();

  let url = $state<string | null>(null);

  // Each picture gets a temporary address; it's released when no longer shown.
  $effect(() => {
    if (!image) {
      url = null;
      return;
    }
    const objectUrl = URL.createObjectURL(photoBlob(image));
    url = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  });

  const style = $derived(size === 'fill' ? '' : `width:${size}px;height:${size}px`);
</script>

<div class="photo" class:fill={size === 'fill'} {style}>
  {#if url}
    <img src={url} {alt} style:object-fit={fit} draggable="false" />
  {:else}
    <span class="placeholder" role="img" aria-label="No photo">
      <Icon name="products" size={size === 'fill' ? 48 : Math.max(18, Math.round((size as number) * 0.45))} />
    </span>
  {/if}
</div>

<style>
  .photo {
    flex: none;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .photo.fill {
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: var(--radius-md);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    background: #fff;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--color-border);
  }
</style>
