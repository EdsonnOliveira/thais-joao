(function (window, document) {
  var ADMIN_PASSWORD = 'admin-tj';
  var SESSION_KEY = 'jp_admin_auth_v1';
  var SUPABASE_URL = 'https://mghmldhsdtbsawcmwuet.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_x4ncGwsOMqCjOZAB3QthrA_ry91d6S6';
  var loginNode = document.getElementById('jp-admin-login');
  var appNode = document.getElementById('jp-admin-app');
  var loginForm = document.getElementById('jp-admin-login-form');
  var passwordInput = document.getElementById('jp-admin-password');
  var loginErrorNode = document.getElementById('jp-admin-login-error');
  var listNode = document.getElementById('jp-admin-list');
  var statusNode = document.getElementById('jp-admin-status');
  var logoutBtn = document.getElementById('jp-admin-logout');
  var refreshBtn = document.getElementById('jp-admin-refresh');
  var loadedOrders = [];

  function getCart() {
    return window.JpGiftCart || null;
  }

  function escapeHtml(value) {
    var cart = getCart();
    if (cart && typeof cart.escapeHtml === 'function') {
      return cart.escapeHtml(value);
    }
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(value) {
    var cart = getCart();
    if (cart && typeof cart.formatCurrency === 'function') {
      return cart.formatCurrency(value);
    }
    var amount = Number(value);
    if (Number.isNaN(amount)) {
      return '';
    }
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function truncatePresenteLabel(value) {
    var cart = getCart();
    if (cart && typeof cart.truncatePresenteLabel === 'function') {
      return cart.truncatePresenteLabel(value);
    }
    return String(value || '');
  }

  function getVirtualCardById(cardId) {
    var cart = getCart();
    if (cart && typeof cart.getVirtualCardById === 'function') {
      return cart.getVirtualCardById(cardId);
    }
    return {
      image: 'media/jp/cartoes/cartao-1.png',
      layout: {
        de: { top: 64, left: 31, width: 47, size: 2.8 },
        presente: { top: 75, left: 39, width: 39, size: 2.8 },
        mensagem: { top: 80.6, left: 41, width: 40, height: 11.5, size: 2.5 },
      },
    };
  }

  function fetchSupabaseJson(path) {
    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, 15000);
    return fetch(SUPABASE_URL + path, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
      },
      signal: controller.signal,
    })
      .then(function (response) {
        window.clearTimeout(timeoutId);
        return response.json().then(function (data) {
          if (!response.ok) {
            return Promise.reject(data);
          }
          return Array.isArray(data) ? data : [];
        });
      })
      .catch(function (error) {
        window.clearTimeout(timeoutId);
        return Promise.reject(error);
      });
  }

  function fetchGiftOrders() {
    return fetchSupabaseJson('/rest/v1/gift_orders?select=*&order=purchased_at.desc');
  }

  function fetchGiftPurchases() {
    return fetchSupabaseJson('/rest/v1/gift_purchases?select=*&order=purchased_at.desc');
  }

  function fetchCatalogItems() {
    return fetch('/items.json?v=7')
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            return Promise.reject(data);
          }
          return Array.isArray(data) ? data : [];
        });
      })
      .catch(function () {
        return [];
      });
  }

  function buildCatalogMap(items) {
    var map = {};
    items.forEach(function (item) {
      map[String(item.id)] = item;
    });
    return map;
  }

  function collectCoveredItemIds(orders) {
    var covered = {};
    orders.forEach(function (order) {
      normalizeItems(order.items).forEach(function (item) {
        if (item.id != null && item.id !== '') {
          covered[String(item.id)] = true;
        }
      });
    });
    return covered;
  }

  function mergeSales(orders, purchases, catalogItems) {
    var catalogMap = buildCatalogMap(catalogItems);
    var coveredItemIds = collectCoveredItemIds(orders);
    var legacyOrders = purchases
      .filter(function (purchase) {
        return !coveredItemIds[String(purchase.item_id)];
      })
      .map(function (purchase) {
        var catalogItem = catalogMap[String(purchase.item_id)] || {};
        var productName = String(catalogItem.produto || 'Presente ' + purchase.item_id);
        return {
          id: 'purchase-' + purchase.id,
          order_nsu: '',
          guest_name: purchase.guest_name,
          guest_email: purchase.guest_email,
          card_id: null,
          card_image: null,
          de: purchase.guest_name || '',
          presente: productName,
          mensagem: '',
          items: [
            {
              id: String(purchase.item_id),
              produto: productName,
              preco: String(catalogItem.preco || ''),
            },
          ],
          total: catalogItem.preco_valor != null ? catalogItem.preco_valor : null,
          purchased_at: purchase.purchased_at,
        };
      });
    return orders
      .concat(legacyOrders)
      .sort(function (left, right) {
        return new Date(right.purchased_at).getTime() - new Date(left.purchased_at).getTime();
      });
  }

  function fetchAllSales() {
    return Promise.all([fetchGiftOrders(), fetchGiftPurchases(), fetchCatalogItems()]).then(
      function (results) {
        return mergeSales(results[0], results[1], results[2]);
      },
    );
  }

  function isAuthed() {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function setAuthed(value) {
    try {
      if (value) {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {}
  }

  function showLogin() {
    if (loginNode) {
      loginNode.hidden = false;
    }
    if (appNode) {
      appNode.hidden = true;
    }
  }

  function showApp() {
    if (loginNode) {
      loginNode.hidden = true;
    }
    if (appNode) {
      appNode.hidden = false;
    }
  }

  function assetUrl(path) {
    var value = String(path || '').trim();
    if (!value) {
      return '';
    }
    if (/^https?:\/\//i.test(value) || value.charAt(0) === '/') {
      return value;
    }
    return '/' + value.replace(/^\.\//, '');
  }

  function normalizeItems(items) {
    if (Array.isArray(items)) {
      return items;
    }
    if (typeof items === 'string') {
      try {
        var parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  }

  function formatDate(value) {
    if (!value) {
      return '';
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function applyCardLayout(previewNode, card) {
    if (!previewNode || !card || !card.layout) {
      return;
    }
    if (card.align) {
      previewNode.dataset.cardAlign = card.align;
    } else {
      delete previewNode.dataset.cardAlign;
    }
    if (card.lineShift) {
      previewNode.style.setProperty('--jp-card-line-shift', card.lineShift + 'em');
    } else {
      previewNode.style.removeProperty('--jp-card-line-shift');
    }
    Object.keys(card.layout).forEach(function (key) {
      var pos = card.layout[key];
      previewNode.style.setProperty('--jp-card-' + key + '-top', pos.top + '%');
      previewNode.style.setProperty('--jp-card-' + key + '-left', pos.left + '%');
      previewNode.style.setProperty('--jp-card-' + key + '-width', pos.width + '%');
      previewNode.style.setProperty('--jp-card-' + key + '-size', (pos.size || 2.8) + 'cqi');
      if (pos.height) {
        previewNode.style.setProperty('--jp-card-' + key + '-height', pos.height + '%');
      } else {
        previewNode.style.removeProperty('--jp-card-' + key + '-height');
      }
    });
  }

  function sanitizeFileName(value) {
    return (
      String(value || 'cartao')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 60) || 'cartao'
    );
  }

  function waitCardFont() {
    if (document.fonts && document.fonts.load) {
      return document.fonts.load('italic 400 48px Cormorant').catch(function () {
        return undefined;
      });
    }
    return Promise.resolve();
  }

  function loadCardImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function applyAlignOffset(card, x, y, fontSize) {
    if (card.align === 'line' && card.lineShift) {
      y += card.lineShift * fontSize;
    } else if (card.align === 'box-line') {
      y -= 0.4 * fontSize;
    }
    return { x: x, y: y };
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, maxHeight, lineHeight) {
    var paragraphs = String(text).split('\n');
    var lines = [];
    paragraphs.forEach(function (paragraph, paragraphIndex) {
      var words = String(paragraph || '').trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        if (paragraphIndex < paragraphs.length - 1) {
          lines.push('');
        }
        return;
      }
      var line = '';
      words.forEach(function (word) {
        var testLine = line ? line + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      });
      if (line) {
        lines.push(line);
      }
    });
    lines.forEach(function (item, index) {
      var lineY = y + index * lineHeight;
      if (maxHeight && lineY + lineHeight > y + maxHeight) {
        return;
      }
      if (item) {
        ctx.fillText(item, x, lineY);
      }
    });
  }

  function drawCardField(ctx, card, key, text, width, height) {
    if (!text || !card.layout || !card.layout[key]) {
      return;
    }
    var pos = card.layout[key];
    var fontSize = ((pos.size || 2.8) / 100) * width;
    var maxWidth = (pos.width / 100) * width;
    var maxHeight = pos.height ? (pos.height / 100) * height : null;
    var coords = applyAlignOffset(card, (pos.left / 100) * width, (pos.top / 100) * height, fontSize);
    ctx.font = 'italic ' + fontSize + 'px Cormorant, serif';
    ctx.fillStyle = '#3c4860';
    ctx.textBaseline = 'top';
    drawWrappedText(ctx, text, coords.x, coords.y, maxWidth, maxHeight, fontSize * 1.2);
  }

  function renderCardCanvas(order) {
    var card = getVirtualCardById(order.card_id);
    var imageSrc = assetUrl(order.card_image || card.image);
    return waitCardFont()
      .then(function () {
        return loadCardImage(imageSrc);
      })
      .then(function (image) {
        var width = image.naturalWidth;
        var height = image.naturalHeight;
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          return Promise.reject(new Error('canvas'));
        }
        ctx.drawImage(image, 0, 0, width, height);
        drawCardField(ctx, card, 'de', String(order.de || ''), width, height);
        drawCardField(
          ctx,
          card,
          'presente',
          truncatePresenteLabel(String(order.presente || '')),
          width,
          height,
        );
        drawCardField(ctx, card, 'mensagem', String(order.mensagem || ''), width, height);
        return canvas;
      });
  }

  function downloadOrderCard(order, button) {
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
    return renderCardCanvas(order)
      .then(function (canvas) {
        var link = document.createElement('a');
        var fileName =
          sanitizeFileName(order.de || order.guest_name || 'cartao') + '-cartao.png';
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
      })
      .catch(function () {
        setStatus('Erro ao baixar cartão.', true);
      })
      .then(function () {
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
        }
      });
  }

  function findOrderById(orderId) {
    return loadedOrders.find(function (order) {
      return String(order.id) === String(orderId);
    });
  }

  function renderItems(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<p class="jp-admin-order__empty">Nenhum item registrado.</p>';
    }
    return (
      '<ul class="jp-admin-order__items">' +
      items
        .map(function (item) {
          return (
            '<li><strong>' +
            escapeHtml(String(item.produto || '')) +
            '</strong><span>' +
            escapeHtml(String(item.preco || '')) +
            '</span></li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }

  function renderCardSection(order) {
    if (!order.card_id && !order.card_image) {
      return (
        '<div class="jp-admin-order__card">' +
        '<p class="jp-admin-order__empty">Cartão virtual não registrado.</p>' +
        '</div>'
      );
    }
    var card = getVirtualCardById(order.card_id);
    var cardImage = assetUrl(order.card_image || card.image);
    return (
      '<div class="jp-admin-order__card">' +
      '<div class="jp-admin-order__card-inner">' +
      '<div class="jp-virtual-card__preview" data-card-id="' +
      escapeHtml(String(order.card_id || '1')) +
      '">' +
      '<img src="' +
      escapeHtml(cardImage) +
      '" alt="Cartão virtual" loading="lazy" decoding="async" />' +
      '<div class="jp-virtual-card__overlay">' +
      '<span class="jp-virtual-card__value jp-virtual-card__value--de">' +
      escapeHtml(String(order.de || '')) +
      '</span>' +
      '<span class="jp-virtual-card__value jp-virtual-card__value--presente">' +
      escapeHtml(truncatePresenteLabel(String(order.presente || ''))) +
      '</span>' +
      '<span class="jp-virtual-card__value jp-virtual-card__value--mensagem">' +
      escapeHtml(String(order.mensagem || '')) +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="jp-admin-btn jp-admin-btn--ghost jp-admin-order__download" data-download-card data-order-id="' +
      escapeHtml(String(order.id || '')) +
      '">Baixar cartão</button>' +
      '</div>'
    );
  }

  function renderOrder(order) {
    var items = normalizeItems(order.items);
    var total =
      order.total != null && order.total !== ''
        ? formatCurrency(Number(order.total))
        : '';
    return (
      '<article class="jp-admin-order">' +
      '<header class="jp-admin-order__head">' +
      '<div><p class="jp-admin-order__meta">' +
      escapeHtml(formatDate(order.purchased_at)) +
      '</p><h2 class="jp-admin-order__guest">' +
      escapeHtml(String(order.guest_name || order.de || 'Convidado')) +
      '</h2>' +
      (order.guest_email
        ? '<p class="jp-admin-order__email">' + escapeHtml(String(order.guest_email)) + '</p>'
        : '') +
      '</div>' +
      (total ? '<p class="jp-admin-order__total">' + escapeHtml(total) + '</p>' : '') +
      '</header>' +
      '<div class="jp-admin-order__body">' +
      renderCardSection(order) +
      '<div class="jp-admin-order__details">' +
      renderItems(items) +
      (order.mensagem
        ? '<p class="jp-admin-order__message"><strong>Mensagem:</strong> ' +
          escapeHtml(String(order.mensagem)) +
          '</p>'
        : '') +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function bindCardLayouts() {
    document.querySelectorAll('.jp-virtual-card__preview[data-card-id]').forEach(function (node) {
      var card = getVirtualCardById(node.getAttribute('data-card-id') || '1');
      applyCardLayout(node, card);
    });
  }

  function setStatus(text, isError) {
    if (!statusNode) {
      return;
    }
    statusNode.textContent = text;
    statusNode.classList.toggle('is-error', !!isError);
  }

  function loadOrders() {
    if (!listNode) {
      return;
    }
    setStatus('Carregando vendas...', false);
    listNode.innerHTML = '';
    var ordersPromise;
    try {
      ordersPromise = fetchAllSales();
      if (!ordersPromise || typeof ordersPromise.then !== 'function') {
        throw new Error('fetch unavailable');
      }
    } catch (error) {
      listNode.innerHTML =
        '<p class="jp-admin-empty is-error">Não foi possível carregar as vendas. Tente atualizar a página.</p>';
      setStatus('Erro ao carregar vendas.', true);
      return;
    }
    ordersPromise
      .then(function (orders) {
        try {
          if (!orders.length) {
            listNode.innerHTML =
              '<p class="jp-admin-empty">Nenhuma venda registrada ainda.</p>';
            setStatus('0 vendas encontradas.', false);
            return;
          }
          loadedOrders = orders;
          listNode.innerHTML = orders.map(renderOrder).join('');
          bindCardLayouts();
          setStatus(orders.length + ' venda(s) encontrada(s).', false);
        } catch (error) {
          listNode.innerHTML =
            '<p class="jp-admin-empty is-error">Erro ao exibir as vendas.</p>';
          setStatus('Erro ao exibir vendas.', true);
        }
      })
      .catch(function () {
        listNode.innerHTML =
          '<p class="jp-admin-empty is-error">Não foi possível carregar as vendas. Tente atualizar a página.</p>';
        setStatus('Erro ao carregar vendas.', true);
      });
  }

  function handleLogin(event) {
    event.preventDefault();
    var password = passwordInput instanceof HTMLInputElement ? passwordInput.value : '';
    if (password !== ADMIN_PASSWORD) {
      if (loginErrorNode) {
        loginErrorNode.hidden = false;
        loginErrorNode.textContent = 'Senha incorreta.';
      }
      return;
    }
    if (loginErrorNode) {
      loginErrorNode.hidden = true;
    }
    setAuthed(true);
    showApp();
    loadOrders();
  }

  function handleLogout() {
    setAuthed(false);
    showLogin();
    if (passwordInput instanceof HTMLInputElement) {
      passwordInput.value = '';
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadOrders);
  }
  if (listNode) {
    listNode.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      var button = target.closest('[data-download-card]');
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      var order = findOrderById(button.getAttribute('data-order-id') || '');
      if (!order || !order.card_id) {
        return;
      }
      downloadOrderCard(order, button);
    });
  }

  if (isAuthed()) {
    showApp();
    loadOrders();
  } else {
    showLogin();
  }
})(window, document);
