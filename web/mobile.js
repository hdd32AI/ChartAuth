/* Mobile navigation is a progressive enhancement; desktop navigation stays native. */
(() => {
  function init() {
    const header = document.querySelector('.topbar, .reader-header');
    if (!header || header.dataset.caMobileReady) return;
    const nav = header.querySelector('nav');
    if (!nav) return;
    const media = matchMedia('(max-width: 800px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const main = document.querySelector('main');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ca-menu-toggle';
    toggle.textContent = '☰';
    toggle.setAttribute('aria-label', 'Open site navigation');
    toggle.setAttribute('aria-expanded', 'false');
    nav.id ||= 'ca-site-navigation';
    toggle.setAttribute('aria-controls', nav.id);
    const progress = document.createElement('div');
    progress.className = 'ca-section-progress';
    const caption = document.createElement('div');
    caption.className = 'ca-progress-caption';
    const count = document.createElement('span');
    count.className = 'ca-progress-count';
    const label = document.createElement('span');
    label.className = 'ca-progress-label';
    caption.append(count, label);
    const dots = document.createElement('div');
    dots.setAttribute('role', 'navigation');
    dots.className = 'ca-progress-dots';
    dots.setAttribute('aria-label', 'Page sections');
    progress.append(caption, dots);
    header.append(toggle, progress);
    header.dataset.caMobileReady = 'true';
    let sections = [], buttons = [], frame = 0, dirty = true;
    const visible = (node) => node && node.getClientRects().length > 0 && !node.closest('[hidden]');
    function closeMenu(returnFocus = false) {
      header.removeAttribute('data-ca-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open site navigation');
      toggle.textContent = '☰';
      if (returnFocus) toggle.focus({ preventScroll: true });
    }
    toggle.addEventListener('click', () => {
      if (toggle.getAttribute('aria-expanded') === 'true') return closeMenu();
      header.dataset.caMenuOpen = 'true';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close site navigation');
      toggle.textContent = '×';
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) closeMenu();
    });
    nav.addEventListener('click', (event) => {
      const target = event.target.closest('a, button');
      if (!target) return;
      closeMenu();
      dirty = true;
      queue();
      if (media.matches) requestAnimationFrame(() => {
        const root = document.querySelector('.page.active') || main;
        const heading = root?.querySelector('h1, h2');
        if (heading && target.matches('button[data-page]')) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      });
    });
    function jump(node, focus = true) {
      closeMenu();
      const inset = header.getBoundingClientRect().height + 16;
      const top = Math.max(0, scrollY + node.getBoundingClientRect().top - inset);
      scrollTo({ top, behavior: reduced.matches ? 'auto' : 'smooth' });
      if (focus) {
        const heading = node.matches('h1,h2,h3') ? node : node.querySelector('h1,h2,h3');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      }
    }
    function collect() {
      const root = document.querySelector('.page.active') || main;
      let targets;
      if (root?.id === 'overview') {
        targets = [
          ['.editorial-hero', 'Welcome'], ['.cinema', 'Walkthrough'],
          ['.care-purpose', 'Care'], ['.decision-section', 'Decisions'],
          ['.evidence-section', 'Evidence'], ['.production-preview', 'Build'],
          ['.impact-section', 'Impact'],
        ];
      } else if (root?.id === 'worklist') {
        targets = visible(root.querySelector('#case-view'))
          ? [['.patient-banner', 'Patient'], ['.chart-pane', 'Chart'], ['.task-pane', 'Review'], ['.activity-pane', 'Activity']]
          : [['.pageheading', 'Worklist'], ['.emr-context', 'Context'], ['.worklist-tools', 'Find a visit'], ['.worklist-scroll', 'Visits']];
      } else if (header.classList.contains('reader-header')) {
        targets = [['.paper-hero', 'Welcome'], ['.paper-abstract', 'Summary'], ['.paper-questions', 'Design'], ['.notes-intro', 'Notes'], ['#sources', 'Sources']];
      } else if (root?.id === 'production') {
        targets = [['.pageheading', 'Overview'], ['.vertical-flow', 'Pipeline'], ['.cost-panel', 'Costs'], ['.design-foot', 'Scale']];
      } else {
        targets = [['.pageheading', 'Overview'], ['.research-layout', 'Research'], ['.probe-table', 'Findings'], ['.design-foot', 'Design']];
      }
      let next = targets.map(([selector, name]) => ({ node: root?.querySelector(selector), name })).filter(({ node }) => visible(node));
      if (!next.length && root) next = [{ node: root, name: 'Overview' }];
      next.sort((a, b) => a.node === b.node ? 0 : (a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      if (next.length === sections.length && next.every((entry, index) => entry.node === sections[index].node)) return;
      sections = next;
      dots.replaceChildren();
      buttons = sections.map((entry, index) => {
        entry.node.dataset.caSection = 'true';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ca-section-dot';
        button.title = entry.name;
        button.setAttribute('aria-label', `${index + 1}. ${entry.name}`);
        const circle = document.createElement('span');
        circle.className = 'ca-dot-circle';
        circle.setAttribute('aria-hidden', 'true');
        button.append(circle);
        button.addEventListener('click', () => jump(entry.node));
        dots.append(button);
        return button;
      });
      progress.hidden = !sections.length;
    }
    function labelTables() {
      document.querySelectorAll('.work-table').forEach((table) => {
        const headings = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        table.querySelectorAll('tbody tr').forEach((row) => {
          [...row.cells].forEach((cell, index) => {
            if (headings[index]) cell.dataset.caLabel = headings[index];
          });
        });
      });
      main?.querySelectorAll('table:not(.work-table), pre').forEach((element) => {
        if (element.parentElement?.hasAttribute('data-ca-scroll-region')) return;
        const region = document.createElement('div');
        region.className = 'ca-scroll-region';
        region.dataset.caScrollRegion = 'true';
        region.tabIndex = 0;
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', element.tagName === 'PRE' ? 'Code example, scroll horizontally for more' : 'Evidence table, scroll horizontally for more');
        element.before(region);
        region.append(element);
      });
    }
    function update() {
      frame = 0;
      if (!media.matches) return;
      if (dirty) {
        dirty = false;
        labelTables();
        collect();
      }
      const headerHeight = Math.ceil(header.getBoundingClientRect().height);
      const value = `${headerHeight}px`;
      if (document.documentElement.style.getPropertyValue('--ca-header-height') !== value) document.documentElement.style.setProperty('--ca-header-height', value);
      if (!sections.length) return;
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const probe = scrollY + headerHeight + 32;
      const tops = sections.map(({ node }) => node.getBoundingClientRect().top + scrollY);
      let active = 0;
      tops.forEach((top, index) => { if (probe >= top) active = index; });
      const bottom = max > 0 && scrollY >= max - 3;
      if (bottom) active = sections.length - 1;
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}`;
      label.textContent = sections[active].name;
      buttons.forEach((button, index) => {
        const start = tops[index] - headerHeight - 32;
        const end = index + 1 < tops.length ? tops[index + 1] - headerHeight - 32 : max;
        const fraction = bottom || index < active ? 1 : index > active ? 0 : Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
        button.style.setProperty('--ca-fill', `${Math.round(fraction * 100)}%`);
        button.dataset.complete = String(fraction >= 0.995);
        if (index === active) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
      });
    }
    function queue() { if (!frame) frame = requestAnimationFrame(update); }
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    addEventListener('popstate', () => { dirty = true; queue(); });
    addEventListener('hashchange', () => { dirty = true; queue(); });
    media.addEventListener('change', () => { closeMenu(); dirty = true; queue(); });
    if ('ResizeObserver' in window) {
      const resize = new ResizeObserver(queue);
      resize.observe(header);
      if (main) resize.observe(main);
    }
    if (main) new MutationObserver(() => { dirty = true; queue(); }).observe(main, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'],
    });
    document.fonts?.ready.then(queue);
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
