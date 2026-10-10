/* SmartHome_Vpar — interacción del panel administrativo. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Menú lateral en móviles.
  const toggle = $('.side-toggle');
  const sidebar = $('#sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Confirmación antes de acciones destructivas.
  let submitting = false;
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) {
      e.preventDefault();
      return;
    }
    submitting = true;
  });

  // Aviso si se abandona un formulario con cambios sin guardar.
  $$('form[data-dirty-check]').forEach((form) => {
    let dirty = false;
    form.addEventListener('input', () => (dirty = true));
    form.addEventListener('change', () => (dirty = true));
    window.addEventListener('beforeunload', (e) => {
      if (dirty && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  });

  // Sincroniza selectores de color con su campo de texto.
  $$('[data-color-for]').forEach((picker) => {
    const text = $(`[data-color-text="${picker.dataset.colorFor}"]`);
    picker.addEventListener('input', () => (text.value = picker.value));
    text.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) picker.value = text.value;
    });
  });

  // Campos de dinero: solo dígitos.
  $$('[data-money]').forEach((el) =>
    el.addEventListener('blur', () => {
      el.value = el.value.replace(/[^\d]/g, '');
    })
  );

  // ------------------------------------------------------------------
  // Optimización de imágenes antes de subirlas: redimensiona fotos grandes
  // (por ejemplo, de la cámara del celular) y las convierte a JPEG/WEBP.
  const supportsDT = (() => {
    try {
      return !!new DataTransfer();
    } catch (e) {
      return false;
    }
  })();

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('no se pudo leer'));
      };
      img.src = url;
    });
  }

  async function optimize(file, maxSide) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 250 * 1024) return file;
    const { img, url } = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const keepAlpha = file.type === 'image/png';
    if (!keepAlpha) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    const type = keepAlpha ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((r) => canvas.toBlob(r, type, 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
    return new File([blob], name, { type, lastModified: Date.now() });
  }

  $$('[data-image-input]').forEach((input) => {
    const preview = input.dataset.preview ? $(input.dataset.preview) : null;
    const drop = input.closest('.dropzone');
    if (drop) {
      ['dragenter', 'dragover'].forEach((ev) => input.addEventListener(ev, () => drop.classList.add('drag')));
      ['dragleave', 'drop'].forEach((ev) => input.addEventListener(ev, () => drop.classList.remove('drag')));
    }
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      const form = input.form;
      const submitBtns = form ? $$('button[type="submit"]', form) : [];
      submitBtns.forEach((b) => (b.disabled = true));
      if (preview) preview.innerHTML = '<p class="hint">Preparando imágenes…</p>';
      let out = files;
      if (supportsDT && !input.hasAttribute('data-keep-format')) {
        const max = Number(input.dataset.max) || 1600;
        out = [];
        for (const f of files) {
          try {
            out.push(await optimize(f, max));
          } catch (e) {
            out.push(f);
          }
        }
        const dt = new DataTransfer();
        out.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      }
      if (preview) {
        preview.innerHTML = '';
        out.forEach((f) => {
          const fig = document.createElement('figure');
          const img = document.createElement('img');
          img.src = URL.createObjectURL(f);
          img.alt = '';
          const cap = document.createElement('figcaption');
          cap.textContent = `${(f.size / 1024).toFixed(0)} KB · se guardará al enviar`;
          fig.append(img, cap);
          preview.append(fig);
        });
      }
      submitBtns.forEach((b) => (b.disabled = false));
    });
  });
})();
