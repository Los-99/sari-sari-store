import { parseRoute, type Route } from './routes';

/**
 * The screen currently shown. Screens read `router.route`; they change it
 * only through `navigate()` and `goBack()` below.
 */
export const router = $state<{ route: Route }>({ route: parseRoute(location.hash) });

/**
 * How many screens deep the user has gone inside the app. It is stored in
 * the browser history so the phone's own Back button and our on-screen
 * back arrow always agree.
 */
function currentDepth(): number {
  const state = history.state as { depth?: number } | null;
  return state?.depth ?? 0;
}

function showCurrentAddress() {
  router.route = parseRoute(location.hash);
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
window.addEventListener('hashchange', showCurrentAddress);

// ---------------------------------------------------------------------------

export async function navigate(path: string, options: { replace?: boolean; force?: boolean } = {}) {
  if (!options.force && !(await mayLeave())) return;
  const url = `#${path}`;
  if (options.replace) {
    history.replaceState({ depth: currentDepth() }, '', url);
  } else {
    history.pushState({ depth: currentDepth() + 1 }, '', url);
  }
  showCurrentAddress();
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
