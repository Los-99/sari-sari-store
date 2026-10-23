<script lang="ts">
  import { tick, untrack } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Field from '../components/Field.svelte';
  import StepperInput from '../components/StepperInput.svelte';
  import ChipPicker from '../components/ChipPicker.svelte';
  import { goBack, linkTo, navigate, setLeaveGuard } from '../lib/router.svelte';
  import { paths } from '../lib/routes';
  import { storage } from '../lib/db/storage.svelte';
  import {
    createProduct,
    findProductsWithSameName,
    getProduct,
    listCategories,
    updateProduct,
  } from '../lib/db/products';
  import { DuplicateBarcodeError, describeError } from '../lib/db/errors';
  import { confirmDialog } from '../lib/dialog.svelte';
  import { showToast } from '../lib/toast.svelte';
  import { LIMITS, SUGGESTED_CATEGORIES, SUGGESTED_UNITS, type Product } from '../lib/model/product';
  import {
    FORM_ORDER,
    emptyForm,
    formFromProduct,
    formsEqual,
    readForm,
    type FormErrors,
    type ProductFormValues,
  } from '../lib/model/product-form';
  import { formatPeso, parsePeso } from '../lib/util/money';
  import { normalizeBarcode, sellingBelowCost } from '../lib/util/validation';

  // One form for both adding and editing.
  let {
    productId: productIdProp,
    barcode: barcodeProp,
  }: {
    /** Set when editing an existing product. */
    productId?: number;
    /** Pre-filled barcode when coming from the scanner. */
    barcode?: string;
  } = $props();

  // The form works on the product and barcode it was opened with. App.svelte
  // creates a fresh form whenever either one changes.
  const productId = untrack(() => productIdProp);
  const barcode = untrack(() => barcodeProp);

  const isEdit = productId !== undefined;
  const backPath = productId !== undefined ? paths.productDetail(productId) : paths.products;

  /** Edit mode: undefined = loading, null = product not found. */
  let original = $state<Product | null | undefined>(isEdit ? undefined : null);
  let loadError = $state('');
  let initial = $state<ProductFormValues>(emptyForm(barcode));
  let values = $state<ProductFormValues>(emptyForm(barcode));
  let categories = $state<string[]>([...SUGGESTED_CATEGORIES]);

  /** Errors are shown only after the first Save attempt, then update as you type. */
  let submitted = $state(false);
  let saving = $state(false);
  /** The barcode the database refused, and who already has it. */
  let conflict = $state<{ barcode: string; owner?: Product } | null>(null);

  const ready = $derived(!isEdit || Boolean(original));
  const dirty = $derived(ready && !formsEqual(values, initial));
  const checked = $derived(readForm(values, original?.isActive ?? true));
  const errors = $derived.by((): FormErrors => {
    const shown: FormErrors = submitted && !checked.ok ? { ...checked.errors } : {};
    if (conflict && conflict.barcode === normalizeBarcode(values.barcode) && !shown.barcode) {
      shown.barcode = conflict.owner
        ? `This barcode is already used by "${conflict.owner.name}".`
        : 'This barcode is already used by another product.';
    }
    return shown;
  });
  const profitPreview = $derived.by(() => {
    const cost = parsePeso(values.cost);
    const selling = parsePeso(values.selling);
    return cost.ok && selling.ok ? selling.value - cost.value : null;
  });

  // Load the product (edit mode) and the category suggestions.
  $effect(() => {
    if (storage.status !== 'ready') return;
    void (async () => {
      try {
        if (productId !== undefined) {
          const product = (await getProduct(productId)) ?? null;
          original = product;
          if (product) {
            initial = formFromProduct(product);
            values = formFromProduct(product);
          }
        }
        categories = await listCategories();
        loadError = '';
      } catch (error) {
        loadError = describeError(error);
      }
    })();
  });

  // Ask before throwing away unsaved changes, however the user leaves.
  $effect(() =>
    setLeaveGuard(async () => {
      if (!dirty) return true;
      return confirmDialog({
        title: 'Discard changes?',
        message: "Your changes to this product haven't been saved.",
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        danger: true,
      });
    }),
  );

  $effect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });

  async function focusFirstError(found: FormErrors) {
    await tick();
    const first = FORM_ORDER.find((key) => found[key]);
    if (!first) return;
    const input = document.getElementById(`pf-${first}`);
    input?.focus();
    input?.scrollIntoView({ block: 'center' });
  }

  async function save(event?: SubmitEvent) {
    event?.preventDefault();
    if (saving || !ready) return;
    submitted = true;

    const result = readForm(values, original?.isActive ?? true);
    if (!result.ok) {
      await focusFirstError(result.errors);
      return;
    }
    const fields = result.fields;

    saving = true;
    try {
      // Allowed, but worth a second look.
      const warnings: string[] = [];
      if (sellingBelowCost(fields)) {
        warnings.push(
          `The selling price (${formatPeso(fields.sellingPriceCentavos)}) is lower than the cost price (${formatPeso(fields.costPriceCentavos)}).`,
        );
      }
      for (const twin of await findProductsWithSameName(fields.name, productId)) {
        warnings.push(`Another product is already named "${twin.name}"${twin.isActive ? '' : ' (deactivated)'}.`);
      }
      if (warnings.length > 0) {
        const proceed = await confirmDialog({
          title: 'Save anyway?',
          details: warnings,
          confirmLabel: 'Save anyway',
          cancelLabel: 'Go back',
        });
        if (!proceed) return;
      }

      if (productId === undefined) {
        const created = await createProduct(fields);
        showToast('Product saved.');
        await navigate(paths.productDetail(created.id), { replace: true, force: true });
      } else {
        await updateProduct(productId, fields);
        showToast('Changes saved.');
        await goBack(paths.productDetail(productId), { force: true });
      }
    } catch (error) {
      if (error instanceof DuplicateBarcodeError) {
        conflict = { barcode: error.barcode, owner: error.existing };
        await focusFirstError({ barcode: 'duplicate' });
      } else {
        showToast(describeError(error), 'error');
      }
    } finally {
      saving = false;
    }
  }

  function describedBy(key: keyof ProductFormValues, hasHint = false) {
    if (errors[key]) return `pf-${key}-error`;
    return hasHint ? `pf-${key}-hint` : undefined;
  }
</script>

<TopBar title={isEdit ? 'Edit Product' : 'Add Product'} backTo={backPath}>
  {#snippet actions()}
    {#if ready}
      <button type="submit" form="product-form" class="btn top-save" disabled={saving}>Save</button>
    {/if}
  {/snippet}
</TopBar>

<div class="content">
  {#if loadError || storage.status === 'error'}
    <div class="card error" role="alert">
      <strong>Can't open the form.</strong>
      <p>{loadError || storage.errorMessage}</p>
    </div>
  {:else if original === undefined}
    <p class="muted" aria-busy="true">Loading…</p>
  {:else if isEdit && original === null}
    <div class="card">
      <p>This product doesn't exist.</p>
      <button type="button" class="btn btn-primary btn-block" onclick={() => navigate(paths.products, { replace: true })}>
        Go to Products
      </button>
    </div>
  {:else}
    <form id="product-form" onsubmit={save} novalidate>
      <section class="card group">
        <Field id="pf-name" label="Product name" required error={errors.name}>
          <input
            id="pf-name"
            type="text"
            bind:value={values.name}
            maxlength={LIMITS.nameMaxLength}
            autocapitalize="words"
            autocomplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy('name')}
          />
        </Field>

        <Field
          id="pf-barcode"
          label="Barcode"
          hint="Optional. Leave empty for products without a barcode. Scanning comes in Phase 6."
          error={errors.barcode}
        >
          <input
            id="pf-barcode"
            type="text"
            class="barcode"
            bind:value={values.barcode}
            maxlength={LIMITS.barcodeMaxLength}
            autocapitalize="off"
            autocomplete="off"
            spellcheck="false"
            aria-invalid={Boolean(errors.barcode)}
            aria-describedby={describedBy('barcode', true)}
          />
        </Field>
        {#if errors.barcode && conflict?.owner && conflict.barcode === normalizeBarcode(values.barcode)}
          <a
            class="btn btn-secondary"
            href={`#${paths.productDetail(conflict.owner.id)}`}
            onclick={linkTo(paths.productDetail(conflict.owner.id))}
          >
            Open "{conflict.owner.name}"
          </a>
        {/if}
      </section>

      <section class="card group">
        <Field id="pf-category" label="Category" hint="Tap a suggestion or type your own." error={errors.category}>
          <input
            id="pf-category"
            type="text"
            bind:value={values.category}
            maxlength={LIMITS.categoryMaxLength}
            placeholder="Others"
            autocapitalize="words"
            autocomplete="off"
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy('category', true)}
          />
        </Field>
        <ChipPicker
          options={categories}
          selected={values.category}
          label="Category suggestions"
          onPick={(option) => (values.category = option)}
        />

        <Field id="pf-unit" label="Unit" required error={errors.unit}>
          <input
            id="pf-unit"
            type="text"
            bind:value={values.unit}
            maxlength={LIMITS.unitMaxLength}
            autocapitalize="off"
            autocomplete="off"
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={describedBy('unit')}
          />
        </Field>
        <ChipPicker
          options={SUGGESTED_UNITS}
          selected={values.unit}
          label="Unit suggestions"
          onPick={(option) => (values.unit = option)}
        />
      </section>

      <section class="card group">
        <div class="two-columns">
          <Field id="pf-cost" label="Cost price" required error={errors.cost}>
            <div class="peso">
              <span aria-hidden="true">₱</span>
              <input
                id="pf-cost"
                type="text"
                inputmode="decimal"
                bind:value={values.cost}
                placeholder="0.00"
                autocomplete="off"
                aria-invalid={Boolean(errors.cost)}
                aria-describedby={describedBy('cost')}
              />
            </div>
          </Field>
          <Field id="pf-selling" label="Selling price" required error={errors.selling}>
            <div class="peso">
              <span aria-hidden="true">₱</span>
              <input
                id="pf-selling"
                type="text"
                inputmode="decimal"
                bind:value={values.selling}
                placeholder="0.00"
                autocomplete="off"
                aria-invalid={Boolean(errors.selling)}
                aria-describedby={describedBy('selling')}
              />
            </div>
          </Field>
        </div>
        {#if profitPreview !== null}
          <p class="profit" class:loss={profitPreview < 0}>
            {profitPreview < 0 ? 'Loss' : 'Profit'} per unit: <strong>{formatPeso(Math.abs(profitPreview))}</strong>
          </p>
        {/if}
      </section>

      <section class="card group">
        <Field id="pf-stock" label="Stock quantity" required error={errors.stock}>
          <StepperInput
            id="pf-stock"
            label="stock"
            max={LIMITS.maxStock}
            bind:value={values.stock}
            invalid={Boolean(errors.stock)}
            describedBy={describedBy('stock')}
          />
        </Field>
        <Field
          id="pf-threshold"
          label="Low-stock alert"
          hint="Warn me when stock is at or below this number. Use 0 to turn the alert off."
          error={errors.threshold}
        >
          <StepperInput
            id="pf-threshold"
            label="low-stock alert"
            max={LIMITS.maxStock}
            bind:value={values.threshold}
            invalid={Boolean(errors.threshold)}
            describedBy={describedBy('threshold', true)}
          />
        </Field>
      </section>

      {#if submitted && !checked.ok}
        <p class="form-error" role="alert">Please fix the fields marked in red.</p>
      {/if}

      <button type="submit" class="btn btn-primary btn-large" disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}
      </button>
    </form>
  {/if}
</div>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .top-save {
    background: transparent;
    color: var(--color-on-primary);
    border-color: rgb(255 255 255 / 0.6);
  }

  .error {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
    color: var(--color-out-text);
  }

  .error p {
    margin: var(--space-1) 0 0;
  }

  .barcode {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    letter-spacing: 0.04em;
  }

  .two-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .peso {
    position: relative;
  }

  .peso span {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    font-weight: 600;
    pointer-events: none;
  }

  .peso :global(input) {
    padding-left: 30px;
  }

  .profit {
    margin: 0;
    color: var(--color-ok-text);
  }

  .profit.loss {
    color: var(--color-danger);
  }

  .form-error {
    margin: 0;
    color: var(--color-danger);
    font-weight: 600;
    text-align: center;
  }
</style>
