/* SmartHome_Vpar — interacción de la tienda pública (sin dependencias). */
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(text) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------------------------------------------------- Menú móvil
  const menuBtn = $('.menu-toggle');
  const nav = $('#main-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
  }
  $$('.nav-drop-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const drop = btn.closest('.nav-drop');
      const open = drop.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', (e) => {
    $$('.nav-drop.open').forEach((d) => {
      if (!d.contains(e.target) && window.innerWidth > 1080) d.classList.remove('open');
    });
  });

  // ---------------------------------------------------- Filtros del catálogo
  const filters = $('#filtros');
  const backdrop = $('.filters-backdrop');
  const setFilters = (open) => {
    if (!filters) return;
    filters.classList.toggle('open', open);
    if (backdrop) backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  $$('.filters-open').forEach((b) => b.addEventListener('click', () => setFilters(true)));
  $$('.filters-close').forEach((b) => b.addEventListener('click', () => setFilters(false)));
  if (backdrop) backdrop.addEventListener('click', () => setFilters(false));
  $$('[data-autosubmit]').forEach((el) => el.addEventListener('change', () => el.form.submit()));

  // ---------------------------------------------------- Galería de producto
  const gallery = $('[data-gallery]');
  const lightbox = $('[data-lightbox]');
  let images = [];
  let current = 0;
  if (lightbox) {
    try {
      images = JSON.parse($('[data-lb-images]', lightbox).textContent);
    } catch (e) {
      images = [];
    }
  }
  const mainImg = $('[data-main-image]');
  const zoomBtn = $('[data-open-lightbox]');
  function showThumb(i) {
    current = i;
    $$('[data-thumb]').forEach((t, idx) => t.classList.toggle('active', idx === i));
    if (mainImg && images[i]) {
      mainImg.src = images[i].src;
      mainImg.alt = images[i].alt;
    }
    if (zoomBtn) zoomBtn.dataset.openLightbox = String(i);
  }
  if (gallery) {
    $$('[data-thumb]', gallery).forEach((t) => t.addEventListener('click', () => showThumb(Number(t.dataset.thumb))));
  }
  function renderLightbox() {
    const img = $('[data-lb-image]', lightbox);
    img.src = images[current].src;
    img.alt = images[current].alt;
    $('[data-lb-caption]', lightbox).textContent = images.length > 1 ? `${current + 1} / ${images.length}` : '';
  }
  function openLightbox(i) {
    if (!lightbox || !images.length) return;
    current = i;
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-lb-close]', lightbox).focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    showThumb(current);
    if (zoomBtn) zoomBtn.focus();
  }
  const step = (d) => {
    current = (current + d + images.length) % images.length;
    renderLightbox();
  };
  if (zoomBtn) zoomBtn.addEventListener('click', () => openLightbox(Number(zoomBtn.dataset.openLightbox) || 0));
  if (lightbox) {
    $('[data-lb-close]', lightbox).addEventListener('click', closeLightbox);
    const prev = $('[data-lb-prev]', lightbox);
    const next = $('[data-lb-next]', lightbox);
    if (prev) prev.addEventListener('click', () => step(-1));
    if (next) next.addEventListener('click', () => step(1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && images.length > 1) step(-1);
      if (e.key === 'ArrowRight' && images.length > 1) step(1);
    });
    let startX = null;
    lightbox.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      if (startX === null || images.length < 2) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  // ---------------------------------------------------- Selector de cantidad
  $$('[data-qty]').forEach((box) => {
    const input = $('[data-qty-input]', box);
    const clamp = (v) => Math.min(99, Math.max(1, Math.floor(Number(v) || 1)));
    $('[data-qty-minus]', box).addEventListener('click', () => (input.value = clamp(input.value - 1)));
    $('[data-qty-plus]', box).addEventListener('click', () => (input.value = clamp(Number(input.value) + 1)));
    input.addEventListener('change', () => (input.value = clamp(input.value)));
  });

  // ---------------------------------------------------- Carrito (modalidad ampliada)
  const KEY = 'shv_cart';
  const readCart = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(c) ? c.filter((i) => i && Number(i.id) > 0) : [];
    } catch (e) {
      return [];
    }
  };
  const writeCart = (c) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch (e) {
      /* almacenamiento no disponible */
    }
    updateCount();
  };
  function updateCount() {
    const n = readCart().reduce((a, i) => a + i.qty, 0);
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }
  updateCount();

  $$('[data-add-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.addCart);
      let qty = 1;
      if (btn.hasAttribute('data-with-qty')) {
        const input = $('[data-qty-input]');
        qty = Math.min(99, Math.max(1, Number(input && input.value) || 1));
      }
      const cart = readCart();
      const item = cart.find((i) => i.id === id);
      if (item) item.qty = Math.min(99, item.qty + qty);
      else cart.push({ id, qty });
      writeCart(cart);
      toast(`Agregado al carrito: ${btn.dataset.name}`);
    });
  });

  const cartPage = $('[data-cart-page]');
  if (cartPage) {
    const list = $('[data-cart-items]');
    const totalEl = $('[data-cart-total]');
    const form = $('[data-checkout-form]');
    const errorEl = $('[data-checkout-error]');
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    let products = [];

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    function render() {
      const cart = readCart();
      const rows = cart
        .map((i) => ({ ...i, p: products.find((p) => p.id === i.id) }))
        .filter((r) => r.p);
      if (!rows.length) {
        list.innerHTML = '<div class="empty"><p>Tu carrito está vacío.</p><a class="btn btn-primary" href="/catalogo">Explorar productos</a></div>';
        totalEl.textContent = fmt.format(0);
        form.hidden = true;
        return;
      }
      form.hidden = false;
      list.innerHTML = rows
        .map(
          (r) => `<div class="cart-item" data-id="${r.p.id}">
            ${r.p.image ? `<img src="${esc(r.p.image)}" alt="">` : '<span></span>'}
            <div><h3><a href="/producto/${esc(r.p.slug)}">${esc(r.p.name)}</a></h3>
              <span class="muted small">${esc(r.p.priceText)} c/u</span>
              ${r.p.available ? '' : '<br><span class="avail avail-off">Agotado: no se incluirá en el pedido</span>'}</div>
            <div class="cart-item-side">
              <div class="qty"><button type="button" data-d="-1" aria-label="Disminuir">−</button><input type="number" min="1" max="99" value="${r.qty}" aria-label="Cantidad"><button type="button" data-d="1" aria-label="Aumentar">+</button></div>
              <strong>${fmt.format(r.p.price * r.qty)}</strong>
              <button type="button" class="link-btn" data-remove>Quitar</button>
            </div></div>`
        )
        .join('');
      const total = rows.filter((r) => r.p.available).reduce((a, r) => a + r.p.price * r.qty, 0);
      totalEl.textContent = fmt.format(total);
    }

    function setQty(id, qty) {
      const cart = readCart();
      const it = cart.find((i) => i.id === id);
      if (it) it.qty = Math.min(99, Math.max(1, qty));
      writeCart(cart);
      render();
    }

    list.addEventListener('click', (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      const id = Number(row.dataset.id);
      if (e.target.closest('[data-remove]')) {
        writeCart(readCart().filter((i) => i.id !== id));
        render();
      }
      const d = e.target.closest('[data-d]');
      if (d) setQty(id, Number($('input', row).value) + Number(d.dataset.d));
    });
    list.addEventListener('change', (e) => {
      const row = e.target.closest('.cart-item');
      if (row && e.target.matches('input')) setQty(Number(row.dataset.id), Number(e.target.value) || 1);
    });

    const ids = readCart().map((i) => i.id);
    fetch(`/api/productos?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((data) => {
        products = data.items || [];
        // Quita del carrito productos que ya no existen.
        writeCart(readCart().filter((i) => products.some((p) => p.id === i.id)));
        render();
      })
      .catch(() => (list.innerHTML = '<p class="form-error">No se pudo cargar el carrito. Revisa tu conexión.</p>'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      const fd = new FormData(form);
      const btn = $('[data-checkout-btn]');
      btn.disabled = true;
      // Abrimos la ventana antes de la petición para evitar bloqueos de ventanas emergentes.
      const win = window.open('', '_blank');
      fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          phone: fd.get('phone'),
          city: fd.get('city'),
          notes: fd.get('notes'),
          items: readCart(),
        }),
      })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          btn.disabled = false;
          if (!ok) {
            if (win) win.close();
            errorEl.textContent = d.error || 'No se pudo registrar el pedido.';
            errorEl.hidden = false;
            return;
          }
          writeCart([]);
          const done = $('[data-checkout-done]');
          done.hidden = false;
          form.hidden = true;
          if (d.whatsapp) {
            if (win) win.location.href = d.whatsapp;
            else window.location.href = d.whatsapp;
            done.innerHTML = `Pedido <strong>${esc(d.code)}</strong> registrado por ${esc(d.totalText)}. Si WhatsApp no se abrió, <a href="${esc(d.whatsapp)}" target="_blank" rel="noopener">haz clic aquí</a>.`;
          } else {
            if (win) win.close();
            done.innerHTML = `Pedido <strong>${esc(d.code)}</strong> registrado por ${esc(d.totalText)}. Nos comunicaremos contigo al teléfono indicado.`;
          }
          list.innerHTML = '';
          totalEl.textContent = fmt.format(0);
        })
        .catch(() => {
          btn.disabled = false;
          if (win) win.close();
          errorEl.textContent = 'No se pudo enviar el pedido. Revisa tu conexión e inténtalo de nuevo.';
          errorEl.hidden = false;
        });
    });
  }
})();
