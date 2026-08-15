(function (window) {
  var STORAGE_KEY = 'jp_gift_cart_v1';
  var GIFT_MESSAGE_KEY = 'jp_gift_message_v1';
  var VIRTUAL_CARDS = [
    {
      id: '1',
      image: 'media/jp/cartoes/cartao-1.png',
      layout: {
        de: { top: 64, left: 31, width: 47, size: 2.8 },
        presente: { top: 75, left: 39, width: 39, size: 2.8 },
        mensagem: { top: 80.6, left: 41, width: 40, height: 11.5, size: 2.5 },
      },
    },
    {
      id: '2',
      image: 'media/jp/cartoes/cartao-2.png',
      layout: {
        de: { top: 51, left: 27, width: 50, size: 2.8 },
        presente: { top: 64, left: 33.3, width: 42, size: 2.8 },
        mensagem: { top: 70.5, left: 35.6, width: 40, height: 18, size: 2.5 },
      },
    },
    {
      id: '3',
      align: 'box-line',
      image: 'media/jp/cartoes/cartao-3.png',
      layout: {
        de: { top: 61.9, left: 26.5, width: 52, size: 2.8 },
        presente: { top: 77.3, left: 33.4, width: 42, size: 2.8 },
        mensagem: { top: 85, left: 36.1, width: 40, height: 12, size: 2.5 },
      },
    },
    {
      id: '4',
      align: 'line',
      lineShift: -0.85,
      image: 'media/jp/cartoes/cartao-4.png',
      layout: {
        de: { top: 54.3, left: 16.3, width: 55, size: 2.8 },
        presente: { top: 67.3, left: 24.2, width: 48, size: 2.8 },
        mensagem: { top: 74.3, left: 26.9, width: 45, height: 12, size: 2.5 },
      },
    },
    {
      id: '5',
      align: 'line',
      image: 'media/jp/cartoes/cartao-5.png',
      layout: {
        de: { top: 56, left: 22.1, width: 55, size: 2.8 },
        presente: { top: 68.3, left: 29.3, width: 42, size: 2.8 },
        mensagem: { top: 74.7, left: 32.2, width: 40, height: 10, size: 2.5 },
      },
    },
    {
      id: '6',
      align: 'line',
      lineShift: -1.1,
      image: 'media/jp/cartoes/cartao-6.png',
      layout: {
        de: { top: 65.7, left: 22.8, width: 58, size: 2.8 },
        presente: { top: 76.5, left: 29.1, width: 40, size: 2.8 },
        mensagem: { top: 82.3, left: 31.7, width: 40, height: 8, size: 2.5 },
      },
    },
    {
      id: '7',
      align: 'line',
      image: 'media/jp/cartoes/cartao-7.png',
      layout: {
        de: { top: 64.2, left: 18.7, width: 55, size: 2.8 },
        presente: { top: 74.7, left: 26.4, width: 42, size: 2.8 },
        mensagem: { top: 80.3, left: 29.2, width: 40, height: 10, size: 2.5 },
      },
    },
    {
      id: '8',
      align: 'mixed',
      image: 'media/jp/cartoes/cartao-8.png',
      layout: {
        de: { top: 53.4, left: 26.9, width: 52, size: 2.8 },
        presente: { top: 66.4, left: 33.6, width: 40, size: 2.8 },
        mensagem: { top: 74, left: 35.3, width: 48, height: 14, size: 2.5 },
      },
    },
    {
      id: '9',
      align: 'line',
      image: 'media/jp/cartoes/cartao-9.png',
      layout: {
        de: { top: 53.6, left: 17.7, width: 58, size: 2.8 },
        presente: { top: 66.1, left: 24.8, width: 42, size: 2.8 },
        mensagem: { top: 71.9, left: 27.6, width: 48, height: 18, size: 2.5 },
      },
    },
  ];

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

  function getVirtualCards() {
    return VIRTUAL_CARDS.slice();
  }

  function getDefaultGiftMessage(cartItems) {
    var presente = cartItems
      .map(function (item) {
        return String(item.produto || '').trim();
      })
      .filter(Boolean)
      .join(', ');
    return {
      cardId: VIRTUAL_CARDS[0].id,
      de: 'Nome de teste',
      presente: presente,
      mensagem: 'Mensagem de teste',
    };
  }

  function readGiftMessage() {
    try {
      var raw = window.localStorage.getItem(GIFT_MESSAGE_KEY);
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      return {
        cardId: String(parsed.cardId || VIRTUAL_CARDS[0].id),
        de: String(parsed.de || ''),
        presente: String(parsed.presente || ''),
        mensagem: String(parsed.mensagem || ''),
      };
    } catch (error) {
      return null;
    }
  }

  function writeGiftMessage(message) {
    window.localStorage.setItem(
      GIFT_MESSAGE_KEY,
      JSON.stringify({
        cardId: String(message.cardId || VIRTUAL_CARDS[0].id),
        de: String(message.de || ''),
        presente: String(message.presente || ''),
        mensagem: String(message.mensagem || ''),
      }),
    );
  }

  function getVirtualCardById(cardId) {
    return (
      VIRTUAL_CARDS.find(function (card) {
        return card.id === String(cardId);
      }) || VIRTUAL_CARDS[0]
    );
  }

  function buildGiftMessagePayload(message, cartItems, options) {
    var card = getVirtualCardById(message.cardId);
    var customer = (options || {}).customer || {};
    return {
      card_id: card.id,
      card_image: card.image,
      de: String(message.de || '').trim(),
      para: 'Thaís & João',
      presente: String(message.presente || '').trim(),
      mensagem: String(message.mensagem || '').trim(),
      guest_name: String(customer.name || message.de || '').trim(),
      guest_email: String(customer.email || '').trim(),
      gifts: cartItems.map(function (item) {
        return {
          id: item.id,
          produto: item.produto,
          preco: item.preco,
        };
      }),
      total: getTotal(),
      submitted_at: new Date().toISOString(),
    };
  }

  function submitGiftMessage(config, message, cartItems, options) {
    var payload = buildGiftMessagePayload(message, cartItems, options);
    var giftConfig = (config || {}).gift_message || {};
    var webhookUrl = String(giftConfig.webhook_url || '').trim();
    var recipientEmail = String(giftConfig.recipient_email || '').trim();

    if (webhookUrl) {
      return fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('submit');
        }
        return payload;
      });
    }

    if (recipientEmail) {
      return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(recipientEmail), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: 'Cartão virtual - ' + payload.de,
          _template: 'table',
          card_id: payload.card_id,
          de: payload.de,
          para: payload.para,
          presente: payload.presente,
          mensagem: payload.mensagem,
          guest_email: payload.guest_email,
          gifts: payload.gifts.map(function (gift) {
            return gift.produto + ' (' + gift.preco + ')';
          }).join(', '),
          total: formatCurrency(payload.total),
          card_image: payload.card_image,
        }),
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || data.success === false) {
            throw new Error('submit');
          }
          return payload;
        });
      });
    }

    return Promise.resolve(payload);
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
    getVirtualCards: getVirtualCards,
    getVirtualCardById: getVirtualCardById,
    getDefaultGiftMessage: getDefaultGiftMessage,
    readGiftMessage: readGiftMessage,
    writeGiftMessage: writeGiftMessage,
    buildGiftMessagePayload: buildGiftMessagePayload,
    submitGiftMessage: submitGiftMessage,
  };

  window.addEventListener('storage', updateBadges);
  document.addEventListener('DOMContentLoaded', updateBadges);
})(window);
