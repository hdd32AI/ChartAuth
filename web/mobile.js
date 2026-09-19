/* Mobile presentation only. Clinical actions, routes and authentication stay unchanged. */
(() => {
  "use strict";
  function boot() {
    if (document.documentElement.classList.contains("mobile-ui-loaded")) return;
    document.documentElement.classList.add("mobile-ui-loaded");
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.content.includes("viewport-fit")) viewport.content += ",viewport-fit=cover";
    const header = document.querySelector(".topbar, .reader-header");
    if (!header) return;
    const menu = header.querySelector("nav"), main = document.querySelector("main");
    if (!menu || !main) return;
    const mobile = window.matchMedia("(max-width: 760px), (max-height: 500px) and (max-width: 960px)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    header.classList.add("mobile-header");
    menu.id ||= "chartauth-main-navigation";
    menu.classList.add("mobile-main-menu");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-menu-toggle";
    toggle.setAttribute("aria-controls", menu.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const tracker = document.createElement("nav");
    tracker.className = "mobile-progress";
    tracker.setAttribute("aria-label", "Page sections and reading progress");
    header.append(toggle, tracker);
    let sections = [], signature = "", frame = 0, headerHeight = 0;
    const visible = (node) => node && !node.closest("[hidden]") && node.getClientRects().length > 0;
    function closeMenu(restoreFocus = false) {
      header.classList.remove("mobile-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      menu.hidden = mobile.matches;
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      header.classList.toggle("mobile-menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
      menu.hidden = !open;
    });
    menu.addEventListener("click", (event) => { if (event.target.closest("a, button")) closeMenu(); });
    document.addEventListener("click", (event) => { if (!header.contains(event.target)) closeMenu(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") closeMenu(true);
    });
    function measureHeader() {
      if (!mobile.matches) return;
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height !== headerHeight) {
        headerHeight = height;
        document.documentElement.style.setProperty("--mobile-header-height", `${height}px`);
      }
    }
    function chapterPlan() {
      if (document.querySelector(".reader-header")) return [
        [".paper-hero", "Intro", "Specifications overview"], ["#note-1", "Design", "Design principles"],
        ["#note-4", "Audit", "Evaluator research"], ["#note-14", "Flow", "The eligibility workflow"],
        ["#note-20", "Quality", "Verification and provenance"], ["#note-24", "Scale", "Production and economics"],
      ];
      const page = document.querySelector(".page.active");
      if (!page) return [];
      if (page.id === "overview") return [
        [".editorial-hero", "Intro", "The experience"], ["#walkthrough", "Demo", "Interactive walkthrough"],
        [".care-purpose", "Care", "Designed around care"], [".decision-section", "Logic", "Decisions and evidence"],
        [".production-preview", "Build", "Implementation and specifications"], ["#impact", "Value", "Practice business case"],
      ];
      if (page.id === "worklist" && visible(document.querySelector("#case-view"))) return [
        [".patient-banner", "Visit", "Patient and visit"], [".chart-pane", "Chart", "Patient chart"],
        [".inquiry-section", "Inquiry", "Eligibility inquiry"], [".response-section", "Reply", "Payer response"],
        [".assessment-section", "Assess", "Eligibility assessment"], [".activity-pane", "Save", "Episode activity and saved result"],
      ];
      if (page.id === "worklist") return [
        ["#queue-view .pageheading", "Queue", "Eligibility worklist"], [".worklist-tools", "Filters", "Search and filters"],
        [".worklist-scroll", "Visits", "Patient visits"],
      ];
      if (page.id === "research") return [
        ["#research .pageheading", "Intro", "Evaluation research"], [".research-layout", "Probes", "Interactive evaluator probes"],
        [".research-conclusion", "Findings", "Findings and boundaries"],
      ];
      if (page.id === "production") return [
        ["#production .pageheading", "Intro", "Production design"], [".vertical-flow", "Process", "Episode production process"],
        [".cost-panel", "Costs", "Editable production costs"],
      ];
      return [];
    }
    function refresh() {
      frame = 0;
      const planned = chapterPlan().map(([selector, label, title]) => ({ node: document.querySelector(selector), label, title })).filter((item) => visible(item.node));
      const nextSignature = planned.map((item) => `${item.label}:${item.title}`).join("|");
      if (nextSignature !== signature) {
        signature = nextSignature;
        sections = planned;
        const fragment = document.createDocumentFragment();
        sections.forEach((item, index) => {
          item.node.id ||= `mobile-section-${item.label.toLowerCase()}`;
          item.node.classList.add("mobile-section");
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mobile-progress-step";
          button.setAttribute("aria-controls", item.node.id);
          button.setAttribute("aria-label", `${item.title}, section ${index + 1} of ${sections.length}`);
          button.title = item.title;
          const dot = document.createElement("span");
          dot.className = "mobile-progress-dot";
          dot.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.className = "mobile-progress-label";
          label.textContent = item.label;
          button.append(dot, label);
          button.addEventListener("click", () => {
            closeMenu(); measureHeader();
            item.node.setAttribute("tabindex", "-1");
            item.node.focus({ preventScroll: true });
            window.scrollTo({ top: Math.max(0, window.scrollY + item.node.getBoundingClientRect().top - headerHeight - 12), behavior: reduceMotion.matches ? "auto" : "smooth" });
          });
          item.button = button;
          fragment.append(button);
        });
        tracker.replaceChildren(fragment);
        tracker.style.setProperty("--section-count", String(Math.max(1, sections.length)));
      }
      measureHeader(); updateProgress();
    }
    function scheduleRefresh() { if (!frame) frame = requestAnimationFrame(refresh); }
    function updateProgress() {
      if (!mobile.matches || !sections.length) return;
      const y = window.scrollY, marker = y + headerHeight + 24;
      const end = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const atBottom = y + window.innerHeight >= end - 3;
      const tops = sections.map((item) => y + item.node.getBoundingClientRect().top);
      let active = 0;
      tops.forEach((top, index) => { if (top <= marker + 1) active = index; });
      if (atBottom) active = sections.length - 1;
      sections.forEach((item, index) => {
        const next = tops[index + 1] ?? end;
        const progress = atBottom ? 1 : Math.max(0, Math.min(1, (marker - tops[index]) / Math.max(1, next - tops[index])));
        item.button.style.setProperty("--section-progress", `${Math.round(progress * 360)}deg`);
        item.button.classList.toggle("is-read", progress >= 1);
        item.button.classList.toggle("is-current", index === active);
        if (index === active) item.button.setAttribute("aria-current", "location");
        else item.button.removeAttribute("aria-current");
      });
      header.classList.toggle("mobile-has-scrolled", y > 8);
    }
    let scrollFrame = 0;
    window.addEventListener("scroll", () => {
      if (scrollFrame || !mobile.matches) return;
      scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateProgress(); });
    }, { passive: true });
    window.addEventListener("resize", scheduleRefresh, { passive: true });
    window.addEventListener("popstate", () => { closeMenu(); scheduleRefresh(); });
    mobile.addEventListener("change", () => { closeMenu(); scheduleRefresh(); });
    if (window.ResizeObserver) new ResizeObserver(scheduleRefresh).observe(header);
    new MutationObserver((records) => {
      if (records.some(({ target }) => target.matches(".page, #case-view, #queue-view, .note-chapter"))) scheduleRefresh();
    }).observe(main, { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    // Preserve the table and row actions while making column names visible in phone cards.
    const workTable = document.querySelector(".work-table");
    if (workTable) {
      const labels = [...workTable.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
      const labelRows = () => {
        workTable.setAttribute("role", "table");
        workTable.querySelectorAll("thead, tbody").forEach((group) => group.setAttribute("role", "rowgroup"));
        workTable.querySelectorAll("tr").forEach((row) => row.setAttribute("role", "row"));
        workTable.querySelectorAll("th").forEach((cell) => cell.setAttribute("role", "columnheader"));
        workTable.querySelectorAll("tbody tr").forEach((row) => {
          [...row.cells].forEach((cell, index) => { cell.dataset.mobileLabel = labels[index] || ""; cell.setAttribute("role", "cell"); });
        });
      };
      labelRows();
      const rows = workTable.querySelector("tbody");
      if (rows) new MutationObserver(labelRows).observe(rows, { childList: true });
    }
    main.querySelectorAll("table:not(.work-table)").forEach((table) => {
      if (table.closest(".mobile-table-scroll")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "mobile-table-scroll";
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Table; scroll horizontally when needed");
      wrapper.tabIndex = 0;
      table.before(wrapper); wrapper.append(table);
    });
    document.documentElement.classList.add("mobile-ready");
    closeMenu(); refresh();
    document.fonts?.ready.then(scheduleRefresh);
    window.addEventListener("load", scheduleRefresh, { once: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
