/*
  Sticky behaviour: the logo/social row scrolls away, the nav row stays pinned.

  Dawn sticks the whole header (`.section-header { position: sticky; top: 0 }`),
  so both rows stay on screen and eat vertical space. There is no way to stick a
  single grid ROW — `position: sticky` on a grid item sticks within its own
  container, which here is the header itself.

  So the header still sticks, but with a NEGATIVE top equal to the height of the
  first row. The logo row is pulled above the viewport and the nav row lands at
  y=0. That offset depends on the logo size and the header padding, both of
  which the merchant can change in the theme editor, so it is measured rather
  than hardcoded.

  Safe to drive from CSS: Dawn's StickyHeader only writes to `top` in hide() and
  reveal(), and both return early when the header is set to "always" sticky
  (sections/header.liquid). It never fights this value.
*/
(() => {
  const DESKTOP = '(min-width: 990px)';
  const root = document.documentElement;

  function update() {
    const header = document.querySelector('.header');
    const nav = document.querySelector('.header__inline-menu');

    // Below 990px the header is a single row and there is nothing to scroll away.
    if (!header || !nav || !window.matchMedia(DESKTOP).matches) {
      root.style.setProperty('--fz-header-sticky-offset', '0px');
      return;
    }

    const headerTop = header.getBoundingClientRect().top;
    const navTop = nav.getBoundingClientRect().top;
    const paddingBottom = parseFloat(getComputedStyle(header).paddingBottom) || 0;

    /*
      The offset has to clear the WHOLE first row, so measure the lowest edge in
      it rather than assuming the logo is tallest — the social icons sit on the
      same row and either can be taller depending on the logo the client
      supplies.
    */
    const logo = document.querySelector('.header__heading-logo, .header__heading');
    const social = document.querySelector('.header__social');
    const rowBottom = [logo, social]
      .filter(Boolean)
      .reduce((low, el) => Math.max(low, el.getBoundingClientRect().bottom - headerTop), 0);

    /*
      Ideally leave as much space above the pinned nav as sits below it, so the
      bar looks evenly padded. But never less than `rowBottom`: at the symmetric
      value alone the logo hung 5.5px into view, leaving a sliver of artwork
      above the nav. Clearing the row wins; even padding is the nice-to-have.

      All measurements are top-relative, so the result does not depend on how
      far the page happens to be scrolled when this runs.
    */
    const symmetric = navTop - headerTop - paddingBottom;
    const offset = Math.max(0, rowBottom, symmetric);
    root.style.setProperty('--fz-header-sticky-offset', `${Math.round(offset)}px`);
  }

  const schedule = () => requestAnimationFrame(update);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  // The logo is an image: its height is unknown until it loads.
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);

  // Theme-editor edits swap the section markup out from under us.
  document.addEventListener('shopify:section:load', schedule);
  document.addEventListener('shopify:section:unload', schedule);
})();
