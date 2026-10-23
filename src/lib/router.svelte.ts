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

window.addEventListener('popstate', showCurrentAddress);
window.addEventListener('hashchange', showCurrentAddress);

export function navigate(path: string, options: { replace?: boolean } = {}) {
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
export function goBack(fallbackPath: string) {
  if (currentDepth() > 0) {
    history.back();
  } else {
    navigate(fallbackPath, { replace: true });
  }
}

/** Click handler for links, so they use `navigate()` instead of a plain jump. */
export function linkTo(path: string) {
  return (event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(path);
  };
}
