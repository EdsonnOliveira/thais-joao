(function (window) {
  var STORAGE_KEY = 'jp_gift_cart_v1';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function readCart() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeCart(items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('jp-cart-updated', { detail: { count: items.length } }));
  }

  function normalizeItem(item) {
    return {
      id: String(item.id),
      produto: String(item.produto),
      preco: String(item.preco),
      preco_valor: Number(item.preco_valor),
      imagem: String(item.imagem),
      pagina_pdf: Number(item.pagina_pdf),
    };
  }

  function getCount() {
    return readCart().length;
  }

  function getTotal() {
    return readCart().reduce(function (sum, item) {
      return sum + (Number(item.preco_valor) || 0);
    }, 0);
  }

  function hasItem(id) {
    return readCart().some(function (item) {
      return item.id === String(id);
    });
  }

  function addItem(item) {
    var normalized = normalizeItem(item);
    var items = readCart();
    if (items.some(function (entry) { return entry.id === normalized.id; })) {
      return false;
    }
    items.push(normalized);
    writeCart(items);
    return true;
  }

  function removeItem(id) {
    var items = readCart().filter(function (item) {
      return item.id !== String(id);
    });
    writeCart(items);
  }

  function clearCart() {
    writeCart([]);
  }

  function tlv(id, value) {
    var size = String(value.length).padStart(2, '0');
    return id + size + value;
  }

  function crc16(payload) {
    var crc = 0xffff;
    for (var i = 0; i < payload.length; i += 1) {
      crc ^= payload.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j += 1) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function buildPixPayload(config, amount, txId) {
    var pix = config.pix || {};
    var key = String(pix.key || '').trim();
    if (!key) {
      return '';
    }
    var holder = String(pix.holder || 'Thais e Joao').substring(0, 25);
    var city = String(pix.city || 'Brasilia').substring(0, 15);
    var amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      return '';
    }
    var amountStr = amountValue.toFixed(2);
    var reference = String(txId || 'PRESENTE').substring(0, 25);
    var merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
    var additionalData = tlv('05', reference);
    var payload =
      tlv('00', '01') +
      tlv('26', merchantAccount) +
      tlv('52', '0000') +
      tlv('53', '986') +
      tlv('54', amountStr) +
      tlv('58', 'BR') +
      tlv('59', holder) +
      tlv('60', city) +
      tlv('62', additionalData);
    payload += '6304';
    return payload + crc16(payload);
  }

  function getPixQrUrl(payload) {
    return (
      'https://quickchart.io/qr?size=220&margin=1&text=' +
      encodeURIComponent(payload)
    );
  }

  function toCents(value) {
    return Math.round(Number(value) * 100);
  }

  function buildInfinityPayItems(cartItems) {
    return cartItems.map(function (item) {
      return {
        quantity: 1,
        price: toCents(item.preco_valor),
        description: String(item.produto).substring(0, 100),
      };
    });
  }

  function createInfinityPayCheckout(config, cartItems, options) {
    var creditCard = config.credit_card || {};
    var handle = String(creditCard.handle || '').trim();
    if (!handle) {
      return Promise.reject(new Error('handle'));
    }
    var items = buildInfinityPayItems(cartItems);
    if (!items.length) {
      return Promise.reject(new Error('empty'));
    }
    var payload = {
      handle: handle,
      items: items,
    };
    var orderNsu = String((options || {}).orderNsu || '').trim();
    if (orderNsu) {
      payload.order_nsu = orderNsu;
    }
    var redirectUrl = String(creditCard.redirect_url || (options || {}).redirectUrl || '').trim();
    if (redirectUrl) {
      payload.redirect_url = redirectUrl;
    }
    var customer = (options || {}).customer;
    if (customer && customer.name && customer.email) {
      payload.customer = {
        name: String(customer.name).substring(0, 100),
        email: String(customer.email).substring(0, 100),
      };
    }
    return fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.url) {
          throw new Error('checkout');
        }
        return data.url;
      });
    });
  }

  function updateBadges() {
    var count = getCount();
    document.querySelectorAll('[data-jp-cart-count]').forEach(function (node) {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
  }

  window.JpGiftCart = {
    escapeHtml: escapeHtml,
    formatCurrency: formatCurrency,
    readCart: readCart,
    getCount: getCount,
    getTotal: getTotal,
    hasItem: hasItem,
    addItem: addItem,
    removeItem: removeItem,
    clearCart: clearCart,
    buildPixPayload: buildPixPayload,
    getPixQrUrl: getPixQrUrl,
    buildInfinityPayItems: buildInfinityPayItems,
    createInfinityPayCheckout: createInfinityPayCheckout,
    updateBadges: updateBadges,
  };

  window.addEventListener('storage', updateBadges);
  document.addEventListener('DOMContentLoaded', updateBadges);
})(window);
