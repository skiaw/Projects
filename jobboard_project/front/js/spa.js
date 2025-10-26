(() => {
  const CONTENT_SELECTOR = '#page-content';
  const loadedScripts = new Set();

  const shouldIgnoreClick = (event) =>
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey;

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') {
      return 'index.html';
    }
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  }

  function loadScript(src) {
    if (loadedScripts.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = () => {
        loadedScripts.add(src);
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function runPageSetup(pathname) {
    const cleanPath = pathname.split('?')[0];

    if (cleanPath.endsWith('jobs.html')) {
      const ensureJobsScript = typeof window.initJobsPage === 'function'
        ? Promise.resolve()
        : loadScript('js/jobs.js');

      await ensureJobsScript;
      if (typeof window.initJobsPage === 'function') {
        window.initJobsPage();
      }
    }
  }

  async function navigate(url, { pushState = true } = {}) {
    const currentContent = document.querySelector(CONTENT_SELECTOR);
    if (!currentContent) {
      window.location.href = url;
      return;
    }

    currentContent.classList.add('is-transitioning');

    const targetUrl = new URL(url, window.location.href);

    try {
      const response = await fetch(targetUrl.href, {
        headers: { 'X-Requested-With': 'fetch' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load ${targetUrl.href}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContent = doc.querySelector(CONTENT_SELECTOR);

      if (!newContent) {
        throw new Error('No matching content wrapper found');
      }

      document.title = doc.title || document.title;
      document.body.className = doc.body.className;
      currentContent.innerHTML = newContent.innerHTML;

      if (pushState) {
        history.pushState(
          { url: targetUrl.pathname },
          '',
          targetUrl.href,
        );
      }

      window.scrollTo(0, 0);
      await runPageSetup(normalizePath(targetUrl.pathname));
    } catch (error) {
      console.warn('[SPA] Falling back to full navigation:', error);
      window.location.href = targetUrl.href;
      return;
    } finally {
      requestAnimationFrame(() => {
        currentContent.classList.remove('is-transitioning');
      });
    }
  }

  function handleLinkClick(event) {
    if (shouldIgnoreClick(event)) {
      return;
    }

    const anchor = event.target.closest('a');
    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      anchor.hasAttribute('download') ||
      anchor.target === '_blank'
    ) {
      return;
    }

    const targetUrl = new URL(href, window.location.href);
    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    if (!targetUrl.pathname.endsWith('.html')) {
      return;
    }

    if (targetUrl.pathname === window.location.pathname) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigate(targetUrl.href);
  }

  function handlePopState(event) {
    const url = event.state?.url
      ? new URL(event.state.url, window.location.origin).href
      : window.location.href;

    navigate(url, { pushState: false });
  }

  document.addEventListener('click', handleLinkClick);
  window.addEventListener('popstate', handlePopState);

  history.replaceState(
    { url: window.location.pathname },
    '',
    window.location.href,
  );

  runPageSetup(normalizePath(window.location.pathname));
})();
