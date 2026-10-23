import { parseRoute, type Route } from './routes';

/**
 * The screen currently shown. Screens read `router.route`; they change it
 * only through `navigate()`, `goBack()` and `replaceAddress()` below.
 * `visit` goes up each time the user arrives at a screen, so App.svelte can
 * start that screen fresh.
 */
export const router = $state<{ route: Route; visit: number }>({ route: parseRoute(location.hash), visit: 0 });

interface HistoryEntry {
  /** How many screens deep inside the app. Lets Back and our ← arrow agree. */
  depth?: number;
  /** Where the page was scrolled when the user left it. */
  scrollY?: number;
}

function entry(): HistoryEntry {
  return (history.state as HistoryEntry | null) ?? {};
}

function currentDepth(): number {
  return entry().depth ?? 0;
}

let shownHash = location.hash;

function showCurrentAddress(force = false) {
  if (!force && location.hash === shownHash) return;
  shownHash = location.hash;
  router.route = parseRoute(location.hash);
  router.visit += 1;
}

/**
 * Change the address without reloading the screen, e.g. while typing a search,
 * so Back returns to the same results.
 */
export function replaceAddress(path: string) {
  history.replaceState(entry(), '', `#${path}`);
  shownHash = location.hash;
  router.route = parseRoute(location.hash);
}

/** Where to scroll back to after returning to a list with Back. */
export function savedScrollPosition(): number | undefined {
  return entry().scrollY;
}

// ---------------------------------------------------------------------------
// Leave guard: a screen with unsaved changes (e.g. the product form) can ask
// "Discard changes?" before the user leaves it, whichever way they leave.

type LeaveGuard = () => Promise<boolean>;

let guard: { check: LeaveGuard; url: string; state: unknown } | null = null;
let skipGuardOnce = false;

/** Returns a function that removes the guard again. */
export function setLeaveGuard(check: LeaveGuard): () => void {
  const entry = { check, url: location.hash, state: history.state };
  guard = entry;
  return () => {
    if (guard === entry) guard = null;
  };
}

async function mayLeave(): Promise<boolean> {
  return guard ? guard.check() : true;
}

window.addEventListener('popstate', () => {
  if (skipGuardOnce) {
    skipGuardOnce = false;
    showCurrentAddress();
    return;
  }
  if (guard) {
    // The phone's Back button already moved away. Put the guarded screen
    // back first, then ask.
    const { url, state, check } = guard;
    history.pushState(state, '', url);
    void check().then((leave) => {
      if (leave) {
        skipGuardOnce = true;
        history.back();
      }
    });
    return;
  }
  showCurrentAddress();
});
// Covers addresses typed by hand. Does nothing if the screen is already shown.
window.addEventListener('hashchange', () => showCurrentAddress());

// ---------------------------------------------------------------------------

export async function navigate(path: string, options: { replace?: boolean; force?: boolean } = {}) {
  if (!options.force && !(await mayLeave())) return;
  const url = `#${path}`;
  if (options.replace) {
    history.replaceState({ depth: currentDepth() }, '', url);
  } else {
    // Remember the scroll position of the screen we are leaving.
    history.replaceState({ ...entry(), scrollY: window.scrollY }, '');
    history.pushState({ depth: currentDepth() + 1 }, '', url);
  }
  showCurrentAddress(true);
  window.scrollTo(0, 0);
}

/**
 * Go to the previous screen. If the user opened this screen directly
 * (e.g. the app started here), go to `fallbackPath` instead of leaving the app.
 */
export async function goBack(fallbackPath: string, options: { force?: boolean } = {}) {
  if (!options.force && !(await mayLeave())) return;
  if (currentDepth() > 0) {
    skipGuardOnce = true;
    history.back();
  } else {
    await navigate(fallbackPath, { replace: true, force: true });
  }
}

/** Click handler for links, so they use `navigate()` instead of a plain jump. */
export function linkTo(path: string) {
  return (event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    void navigate(path);
  };
}
