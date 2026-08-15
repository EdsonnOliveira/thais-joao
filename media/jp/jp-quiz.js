(function (window) {
  var SUPABASE_URL = 'https://mghmldhsdtbsawcmwuet.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_x4ncGwsOMqCjOZAB3QthrA_ry91d6S6';
  var HOST_NAME = 'admin-tj';
  var HOST_PIN = 'THAISJOAO';
  var PLAYER_STORAGE_KEY = 'jp_quiz_player_v1';
  var MAIN_QUESTION_COUNT = 10;
  var QUESTION_MS = 7000;
  var MIN_QUESTION_SECONDS = 3;
  var MAX_QUESTION_SECONDS = 120;
  var OPTION_COLORS = {
    A: '#e21b3c',
    B: '#1368ce',
    C: '#d89e00',
  };
  var AVATAR_COLORS = [
    '#c78665',
    '#bf7b5d',
    '#3c4860',
    '#8b5a6b',
    '#6b8b7a',
    '#7a6b8b',
    '#b8860b',
    '#4682b4',
  ];

  var supabaseClient = null;
  var isHost = false;
  var session = null;
  var players = [];
  var answers = [];
  var questions = [];
  var playerId = null;
  var playerRecord = null;
  var appNode = null;
  var stageNode = null;
  var fxNode = null;
  var timerFrame = null;
  var confettiDone = false;
  var lastResultsConfettiQ = -1;
  var channel = null;
  var syncTimer = null;
  var renderTimer = null;
  var syncInFlight = false;
  var syncQueued = false;
  var lastRenderSignature = '';
  var lastPhaseKey = '';
  var eventsBound = false;
  var pendingAvatarPhoto = null;
  var pendingPlayerName = '';
  var joinInFlight = false;
  var answerInFlight = false;
  var advanceTimer = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderBtnIcon(name) {
    var icons = {
      start:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="currentColor" d="M8 5v14l11-7z"/>' +
        '</svg>',
      finish:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="currentColor" d="M6 6h12v12H6z"/>' +
        '</svg>',
      reset:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 0 1 13.7-5.7M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.7M4 20v-5h5"/>' +
        '</svg>',
      leave:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>' +
        '</svg>',
      join:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>' +
        '</svg>',
      photo:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
        '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="13" r="4"/>' +
        '</svg>',
      timer:
        '<svg class="jp-quiz-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="13" r="8"/>' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 9v4l3 2"/>' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9 2h6"/>' +
        '</svg>',
    };
    return icons[name] || '';
  }

  function formatDisplayText(value) {
    var text = String(value);
    var matches = [];
    var quoteRegex = /"([^"]*)"/g;
    var nameRegex = /(Thaís & João Pedro|Thaís e João Pedro|João Pedro|Thaís)/g;
    var match;
    while ((match = quoteRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        html: '<strong>' + escapeHtml('"' + match[1] + '"') + '</strong>',
      });
    }
    while ((match = nameRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        html: '<strong>' + escapeHtml(match[0]) + '</strong>',
      });
    }
    matches.sort(function (a, b) {
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      return b.length - a.length;
    });
    var filtered = [];
    var end = 0;
    matches.forEach(function (item) {
      if (item.index >= end) {
        filtered.push(item);
        end = item.index + item.length;
      }
    });
    if (!filtered.length) {
      return escapeHtml(text);
    }
    var parts = [];
    var lastIndex = 0;
    filtered.forEach(function (item) {
      if (item.index > lastIndex) {
        parts.push(escapeHtml(text.slice(lastIndex, item.index)));
      }
      parts.push(item.html);
      lastIndex = item.index + item.length;
    });
    if (lastIndex < text.length) {
      parts.push(escapeHtml(text.slice(lastIndex)));
    }
    return parts.join('');
  }

  function getConfig() {
    var node = document.getElementById('jp-quiz-app');
    var dataset = node ? node.dataset : {};
    return {
      url: dataset.supabaseUrl || SUPABASE_URL,
      key: dataset.supabaseKey || SUPABASE_KEY,
    };
  }

  function readStoredPlayer() {
    try {
      var raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function writeStoredPlayer(data) {
    try {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      return;
    }
  }

  function clearStoredPlayer() {
    try {
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    } catch (error) {
      return;
    }
  }

  function restorePlayer() {
    var stored = readStoredPlayer();
    if (!stored || !session) {
      return Promise.resolve();
    }
    if (stored.sessionId !== session.id) {
      clearStoredPlayer();
      return Promise.resolve();
    }
    if (stored.isHost && session.status === 'lobby') {
      clearStoredPlayer();
      setHostMode(false);
      return Promise.resolve();
    }
    if (stored.isHost) {
      setHostMode(true);
      return Promise.resolve();
    }
    if (!stored.id) {
      return Promise.resolve();
    }
    return supabaseClient
      .from('quiz_players')
      .select('*')
      .eq('id', stored.id)
      .eq('session_id', session.id)
      .maybeSingle()
      .then(function (result) {
        if (result.data) {
          playerId = result.data.id;
          playerRecord = result.data;
          return;
        }
        clearStoredPlayer();
      });
  }

  function isHostName(name) {
    return String(name).trim().toLowerCase() === HOST_NAME;
  }

  function setHostMode(active) {
    isHost = active;
    if (appNode) {
      appNode.classList.toggle('jp-quiz-app--host', active);
    }
  }

  function safePhotoSrc(value) {
    if (!value || String(value).indexOf('data:image/') !== 0) {
      return '';
    }
    return String(value).replace(/"/g, '');
  }

  function renderPlayerAvatar(player, extraClass) {
    var className = 'jp-quiz-avatar' + (extraClass ? ' ' + extraClass : '');
    var photo = player && safePhotoSrc(player.avatar_photo);
    if (photo) {
      return (
        '<span class="' +
        className +
        ' jp-quiz-avatar--photo-wrap">' +
        '<img class="jp-quiz-avatar__img" src="' +
        photo +
        '" alt="" />' +
        '</span>'
      );
    }
    var color = player && player.avatar_color ? player.avatar_color : '#c78665';
    return (
      '<span class="' +
      className +
      '" style="background:' +
      escapeHtml(color) +
      '"></span>'
    );
  }

  function compressAvatarFile(file) {
    return new Promise(function (resolve) {
      if (!file || !String(file.type).match(/^image\//)) {
        resolve(null);
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var size = 128;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          var scale = Math.max(size / img.width, size / img.height);
          var width = img.width * scale;
          var height = img.height * scale;
          ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = function () {
          resolve(null);
        };
        img.src = reader.result;
      };
      reader.onerror = function () {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  function pickAvatarColor(name) {
    var total = 0;
    for (var i = 0; i < name.length; i += 1) {
      total += name.charCodeAt(i);
    }
    return AVATAR_COLORS[total % AVATAR_COLORS.length];
  }

  function getQuestion(index) {
    return questions[index] || null;
  }

  function getQuestionMs() {
    if (!session || !session.question_duration_ms) {
      return QUESTION_MS;
    }
    return session.question_duration_ms;
  }

  function getQuestionDurationSeconds() {
    return Math.round(getQuestionMs() / 1000);
  }

  function getUrgentMs() {
    var duration = getQuestionMs();
    if (duration <= 5000) {
      return Math.max(1000, Math.floor(duration / 2));
    }
    return 3000;
  }

  function getRemainingMs() {
    if (!session || !session.question_started_at) {
      return getQuestionMs();
    }
    var started = new Date(session.question_started_at).getTime();
    var elapsed = Date.now() - started;
    return Math.max(0, getQuestionMs() - elapsed);
  }

  function getElapsedMs() {
    return getQuestionMs() - getRemainingMs();
  }

  function stopAdvanceLoop() {
    if (advanceTimer) {
      window.clearInterval(advanceTimer);
      advanceTimer = null;
    }
  }

  function startAdvanceLoop() {
    if (advanceTimer) {
      return;
    }
    advanceTimer = window.setInterval(function () {
      runAutoAdvance().then(function (changed) {
        if (changed) {
          scheduleRender(true);
        }
      });
    }, 1000);
  }

  function runAutoAdvance() {
    if (!supabaseClient || !session) {
      return Promise.resolve(false);
    }
    if (session.status !== 'question' && session.status !== 'results') {
      return Promise.resolve(false);
    }
    return supabaseClient.rpc('quiz_auto_advance').then(function (result) {
      if (result.error || !result.data) {
        return false;
      }
      if (!result.data.action) {
        return false;
      }
      return loadSession().then(function () {
        return true;
      });
    });
  }

  function stopTimer() {
    if (timerFrame) {
      window.cancelAnimationFrame(timerFrame);
      timerFrame = null;
    }
  }

  function resetAutoHostFlow() {
    stopAdvanceLoop();
  }

  function startTimer(onTick) {
    stopTimer();
    function tick() {
      onTick(getRemainingMs(), getElapsedMs());
      if (session && session.status === 'question') {
        timerFrame = window.requestAnimationFrame(tick);
      }
    }
    tick();
  }

  function sortPlayers(list) {
    return list.slice().sort(function (a, b) {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return a.display_name.localeCompare(b.display_name);
    });
  }

  function getPlayerAnswer(questionIndex, targetPlayerId) {
    return answers.find(function (item) {
      return item.player_id === targetPlayerId && item.question_index === questionIndex;
    });
  }

  function getCurrentQuestionIndex() {
    return session ? session.current_question : 0;
  }

  function isExtraQuestion(qIndex) {
    return questions.length > MAIN_QUESTION_COUNT && qIndex === questions.length - 1;
  }

  function formatQuestionBadge(qIndex) {
    if (isExtraQuestion(qIndex)) {
      return 'Extra';
    }
    return qIndex + 1 + ' / ' + MAIN_QUESTION_COUNT;
  }

  function formatQuestionResultTitle(qIndex) {
    if (isExtraQuestion(qIndex)) {
      return 'Resultado da pergunta extra';
    }
    return 'Resultado da pergunta ' + (qIndex + 1);
  }

  function formatPoints(value) {
    return '+' + value.toLocaleString('pt-BR');
  }

  function getPlayersBadgeReadyClass(count) {
    return count >= 2 ? ' jp-quiz-players-badge--ready' : '';
  }

  function renderPlayersCountBadge(extraClass) {
    var count = players.length;
    var label = count === 1 ? 'jogador conectado' : 'jogadores conectados';
    return (
      '<p class="jp-quiz-players-badge' +
      getPlayersBadgeReadyClass(count) +
      (extraClass ? ' ' + extraClass : '') +
      '">' +
      '<span class="jp-quiz-players-badge__count" data-players-count>' +
      count +
      '</span>' +
      '<span class="jp-quiz-players-badge__label" data-players-label>' +
      label +
      '</span>' +
      '</p>'
    );
  }

  function patchPlayersCountBadge() {
    if (!appNode) {
      return;
    }
    var count = players.length;
    var label = count === 1 ? 'jogador conectado' : 'jogadores conectados';
    appNode.querySelectorAll('[data-players-count]').forEach(function (node) {
      node.textContent = String(count);
    });
    appNode.querySelectorAll('[data-players-label]').forEach(function (node) {
      node.textContent = label;
    });
    appNode.querySelectorAll('.jp-quiz-players-badge').forEach(function (node) {
      node.classList.toggle('jp-quiz-players-badge--ready', count >= 2);
    });
  }

  function getQuestionPoints(qIndex, targetPlayerId) {
    var answer = getPlayerAnswer(qIndex, targetPlayerId);
    return answer ? answer.points_earned : 0;
  }

  function sortPlayersByQuestion(qIndex) {
    return players.slice().sort(function (a, b) {
      var scoreA = getQuestionPoints(qIndex, a.id);
      var scoreB = getQuestionPoints(qIndex, b.id);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.display_name.localeCompare(b.display_name);
    });
  }

  function getQuestionRankPosition(qIndex, targetPlayerId) {
    var sorted = sortPlayersByQuestion(qIndex);
    for (var i = 0; i < sorted.length; i += 1) {
      if (sorted[i].id === targetPlayerId) {
        return i + 1;
      }
    }
    return 0;
  }

  function shouldUseQuestionRanking() {
    return session && (session.status === 'question' || session.status === 'results');
  }

  function renderQuestionRankingRows(qIndex, highlightId, limit) {
    var ranked = sortPlayersByQuestion(qIndex).slice(0, limit || 10);
    if (!ranked.length) {
      return '<p class="jp-quiz-empty">Ninguém no ranking ainda.</p>';
    }
    var maxScore = getQuestionPoints(qIndex, ranked[0].id) || 1;
    return ranked
      .map(function (player, index) {
        var questionScore = getQuestionPoints(qIndex, player.id);
        var medal = '';
        if (index === 0 && questionScore > 0) {
          medal = '🥇';
        } else if (index === 1 && questionScore > 0) {
          medal = '🥈';
        } else if (index === 2 && questionScore > 0) {
          medal = '🥉';
        }
        var width = Math.max(8, Math.round((questionScore / maxScore) * 100));
        var placeClass = '';
        if (index === 0 && questionScore > 0) {
          placeClass = ' jp-quiz-rank__row--gold';
        } else if (index === 1 && questionScore > 0) {
          placeClass = ' jp-quiz-rank__row--silver';
        } else if (index === 2 && questionScore > 0) {
          placeClass = ' jp-quiz-rank__row--bronze';
        }
        var activeClass =
          highlightId && player.id === highlightId && index > 2
            ? ' jp-quiz-rank__row--me'
            : '';
        return (
          '<div class="jp-quiz-rank__row' +
          placeClass +
          activeClass +
          '">' +
          '<span class="jp-quiz-rank__pos">' +
          (medal || index + 1) +
          '</span>' +
          renderPlayerAvatar(player, 'jp-quiz-rank__avatar') +
          '<div class="jp-quiz-rank__info">' +
          '<div class="jp-quiz-rank__name">' +
          escapeHtml(player.display_name) +
          '</div>' +
          '<div class="jp-quiz-rank__bar"><span style="width:' +
          width +
          '%;background:' +
          escapeHtml(player.avatar_color) +
          '"></span></div>' +
          '</div>' +
          '<span class="jp-quiz-rank__score">' +
          questionScore.toLocaleString('pt-BR') +
          '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderRankingRows(list, highlightId, limit) {
    var ranked = sortPlayers(list).slice(0, limit || 10);
    if (!ranked.length) {
      return '<p class="jp-quiz-empty">Ninguém no ranking ainda.</p>';
    }
    var maxScore = ranked[0].total_score || 1;
    return ranked
      .map(function (player, index) {
        var medal = '';
        if (index === 0) {
          medal = '🥇';
        } else if (index === 1) {
          medal = '🥈';
        } else if (index === 2) {
          medal = '🥉';
        }
        var width = Math.max(8, Math.round((player.total_score / maxScore) * 100));
        var placeClass = '';
        if (index === 0) {
          placeClass = ' jp-quiz-rank__row--gold';
        } else if (index === 1) {
          placeClass = ' jp-quiz-rank__row--silver';
        } else if (index === 2) {
          placeClass = ' jp-quiz-rank__row--bronze';
        }
        var activeClass =
          highlightId && player.id === highlightId && index > 2
            ? ' jp-quiz-rank__row--me'
            : '';
        return (
          '<div class="jp-quiz-rank__row' +
          placeClass +
          activeClass +
          '">' +
          '<span class="jp-quiz-rank__pos">' +
          (medal || index + 1) +
          '</span>' +
          renderPlayerAvatar(player, 'jp-quiz-rank__avatar') +
          '<div class="jp-quiz-rank__info">' +
          '<div class="jp-quiz-rank__name">' +
          escapeHtml(player.display_name) +
          '</div>' +
          '<div class="jp-quiz-rank__bar"><span style="width:' +
          width +
          '%;background:' +
          escapeHtml(player.avatar_color) +
          '"></span></div>' +
          '</div>' +
          '<span class="jp-quiz-rank__score">' +
          player.total_score.toLocaleString('pt-BR') +
          '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderHostDurationControl() {
    if (!session || session.status !== 'lobby') {
      return '';
    }
    return (
      '<div class="jp-quiz-host__duration">' +
      '<label class="jp-quiz-host__duration-label" for="jp-quiz-duration">' +
      renderBtnIcon('timer') +
      '<span>Tempo por pergunta</span></label>' +
      '<div class="jp-quiz-host__duration-field">' +
      '<input id="jp-quiz-duration" class="jp-quiz-host__duration-input" type="number" min="' +
      MIN_QUESTION_SECONDS +
      '" max="' +
      MAX_QUESTION_SECONDS +
      '" step="1" inputmode="numeric" value="' +
      getQuestionDurationSeconds() +
      '" />' +
      '<span class="jp-quiz-host__duration-suffix">s</span>' +
      '</div>' +
      '</div>'
    );
  }

  function renderHostPanel() {
    if (!isHost) {
      return '';
    }
    var status = session ? session.status : 'lobby';
    var quizStarted = status !== 'lobby';
    var startButton =
      status === 'lobby'
        ? '<button type="button" class="jp-quiz-btn jp-quiz-btn--host" data-host-action="start">' +
          renderBtnIcon('start') +
          '<span class="jp-quiz-btn__label">Iniciar quiz</span></button>'
        : '';
    var finishButton = quizStarted
      ? '<button type="button" class="jp-quiz-btn jp-quiz-btn--host" data-host-action="finish">' +
        renderBtnIcon('finish') +
        '<span class="jp-quiz-btn__label">Encerrar quiz</span></button>'
      : '';
    var resetButton = quizStarted
      ? '<button type="button" class="jp-quiz-btn jp-quiz-btn--host" data-host-action="reset">' +
        renderBtnIcon('reset') +
        '<span class="jp-quiz-btn__label">Reiniciar quiz</span></button>'
      : '';
    var qIndex = getCurrentQuestionIndex();
    var useQuestionRank = shouldUseQuestionRanking();
    var rankLabel = useQuestionRank ? 'Ranking da pergunta' : 'Jogadores na sala';
    var rankRows = useQuestionRank
      ? renderQuestionRankingRows(qIndex, null, 10)
      : renderRankingRows(players, null, 10);
    return (
      '<aside class="jp-quiz-host">' +
      '<p class="jp-quiz-host__label">Painel do host</p>' +
      renderPlayersCountBadge('jp-quiz-players-badge--host') +
      renderHostDurationControl() +
      '<div class="jp-quiz-host__actions">' +
      startButton +
      finishButton +
      resetButton +
      '</div>' +
      '<p class="jp-quiz-host__rank-label">' +
      rankLabel +
      '</p>' +
      '<div class="jp-quiz-host__rank">' +
      rankRows +
      '</div>' +
      '</aside>'
    );
  }

  function renderLobby() {
    var joined = Boolean(playerRecord) || isHost;
    return (
      '<section class="jp-quiz-screen jp-quiz-screen--lobby">' +
      '<div class="jp-quiz-card">' +
      '<p class="jp-quiz-kicker">Quiz do casamento</p>' +
      '<h1 class="jp-quiz-title">' +
      formatDisplayText(questions.length ? 'Quem conhece melhor Thaís & João Pedro?' : 'Quiz') +
      '</h1>' +
      (!isHost ? renderPlayersCountBadge() : '') +
      (isHost
        ? '<p class="jp-quiz-note">Modo host ativo. Quando todos entrarem, clique em Iniciar.</p>' +
          '<button type="button" class="jp-quiz-btn jp-quiz-btn--ghost" data-quiz-action="leave">' +
          renderBtnIcon('leave') +
          '<span class="jp-quiz-btn__label">Sair</span></button>'
        : joined
          ? '<p class="jp-quiz-note">Aguardando o host iniciar...</p><div class="jp-quiz-player-tag">' +
            renderPlayerAvatar(playerRecord, 'jp-quiz-player-tag__avatar') +
            '<span>Você: <strong>' +
            escapeHtml(playerRecord.display_name) +
            '</strong></span></div>' +
            '<button type="button" class="jp-quiz-btn jp-quiz-btn--ghost" data-quiz-action="leave">' +
            renderBtnIcon('leave') +
            '<span class="jp-quiz-btn__label">Sair</span></button>'
          : '<form class="jp-quiz-join" id="jp-quiz-join-form">' +
            '<label for="jp-quiz-name">Seu nome</label>' +
            '<input id="jp-quiz-name" type="text" maxlength="24" autocomplete="off" required placeholder="Digite seu nome" value="' +
            escapeHtml(pendingPlayerName) +
            '" />' +
            '<div class="jp-quiz-join__photo-block">' +
            '<label for="jp-quiz-photo">Sua foto (obrigatória)</label>' +
            '<div class="jp-quiz-join__photo">' +
            (pendingAvatarPhoto
              ? '<img class="jp-quiz-join__preview" src="' +
                safePhotoSrc(pendingAvatarPhoto) +
                '" alt="" />'
              : '<span class="jp-quiz-join__preview jp-quiz-join__preview--empty">Adicione sua foto</span>') +
            '<label class="jp-quiz-join__photo-btn">' +
            '<input id="jp-quiz-photo" type="file" accept="image/*" capture="user" hidden />' +
            renderBtnIcon('photo') +
            '<span class="jp-quiz-btn__label">Tirar / escolher foto</span></label>' +
            '</div>' +
            '</div>' +
            '<button type="submit" class="jp-quiz-btn jp-quiz-btn--primary">' +
            renderBtnIcon('join') +
            '<span class="jp-quiz-btn__label">Entrar no quiz</span></button>' +
            '</form>') +
      '</div>' +
      renderHostPanel() +
      '</section>'
    );
  }

  function updateTimerDisplay(remainingMs) {
    if (!appNode) {
      return;
    }
    var timerNode = appNode.querySelector('.jp-quiz-timer');
    if (!timerNode) {
      return;
    }
    var progress = remainingMs / getQuestionMs();
    var radius = 42;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - progress);
    var progressNode = timerNode.querySelector('.jp-quiz-timer__progress');
    var valueNode = timerNode.querySelector('.jp-quiz-timer__value');
    if (progressNode) {
      progressNode.style.strokeDasharray = String(circumference);
      progressNode.style.strokeDashoffset = String(offset);
    }
    if (valueNode) {
      valueNode.textContent = String(Math.ceil(remainingMs / 1000));
    }
    timerNode.classList.toggle('jp-quiz-timer--urgent', remainingMs <= getUrgentMs() && remainingMs > 0);
  }

  function renderTimerSvg(remainingMs) {
    var progress = remainingMs / getQuestionMs();
    var radius = 42;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - progress);
    var urgent = remainingMs <= getUrgentMs() ? ' jp-quiz-timer--urgent' : '';
    return (
      '<div class="jp-quiz-timer' +
      urgent +
      '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="jp-quiz-timer__track" cx="50" cy="50" r="' +
      radius +
      '"></circle>' +
      '<circle class="jp-quiz-timer__progress" cx="50" cy="50" r="' +
      radius +
      '" style="stroke-dasharray:' +
      circumference +
      ';stroke-dashoffset:' +
      offset +
      '"></circle>' +
      '</svg>' +
      '<span class="jp-quiz-timer__value">' +
      Math.ceil(remainingMs / 1000) +
      '</span>' +
      '</div>'
    );
  }

  function renderQuestionScreen(remainingMs) {
    var qIndex = getCurrentQuestionIndex();
    var question = getQuestion(qIndex);
    if (!question) {
      return '<section class="jp-quiz-screen"><p class="jp-quiz-empty">Pergunta não encontrada.</p></section>';
    }
    var myAnswer = playerId ? getPlayerAnswer(qIndex, playerId) : null;
    var locked = remainingMs <= 0 || Boolean(myAnswer);
    var options = ['A', 'B', 'C']
      .map(function (key) {
        var selected = myAnswer && myAnswer.selected_option === key;
        var classes = 'jp-quiz-option jp-quiz-option--' + key.toLowerCase();
        if (selected) {
          classes += ' is-selected';
        }
        if (locked) {
          classes += ' is-locked';
        }
        return (
          '<button type="button" class="' +
          classes +
          '" data-option="' +
          key +
          '" style="background:' +
          OPTION_COLORS[key] +
          '"' +
          (locked ? ' disabled' : '') +
          '>' +
          '<span class="jp-quiz-option__label">' +
          key +
          '</span>' +
          '<span class="jp-quiz-option__text">' +
          formatDisplayText(question.options[key]) +
          '</span>' +
          '</button>'
        );
      })
      .join('');
    var extraQuestion = isExtraQuestion(qIndex);
    return (
      '<section class="jp-quiz-screen jp-quiz-screen--question' +
      (extraQuestion ? ' jp-quiz-screen--extra' : '') +
      '">' +
      (extraQuestion
        ? '<div class="jp-quiz-extra-banner">' +
          '<span class="jp-quiz-extra-banner__label">Extra</span>' +
          '<span class="jp-quiz-extra-banner__sub">Pergunta surpresa!</span>' +
          '</div>' +
          '<div class="jp-quiz-question-head jp-quiz-question-head--extra">' +
          renderTimerSvg(remainingMs) +
          '</div>'
        : '<div class="jp-quiz-question-head">' +
          '<span class="jp-quiz-badge">' +
          formatQuestionBadge(qIndex) +
          '</span>' +
          renderTimerSvg(remainingMs) +
          '</div>') +
      '<h2 class="jp-quiz-question">' +
      formatDisplayText(question.text) +
      '</h2>' +
      '<div class="jp-quiz-options">' +
      options +
      '</div>' +
      (locked && myAnswer
        ? '<p class="jp-quiz-note">Resposta registrada. Aguardando resultado...</p>'
        : locked
          ? '<p class="jp-quiz-note">Tempo esgotado. Aguardando resultado...</p>'
          : '<p class="jp-quiz-note">Escolha rápido para ganhar mais pontos!</p>') +
      renderHostPanel() +
      '</section>'
    );
  }

  function renderResultsScreen() {
    var qIndex = getCurrentQuestionIndex();
    var question = getQuestion(qIndex);
    var myAnswer = playerId ? getPlayerAnswer(qIndex, playerId) : null;
    var correct = question ? question.correct : '';
    var points = myAnswer ? myAnswer.points_earned : 0;
    var selected = myAnswer ? myAnswer.selected_option : null;
    var feedbackClass = myAnswer && myAnswer.is_correct ? ' is-correct' : ' is-wrong';
    var optionsHtml = question
      ? ['A', 'B', 'C']
          .map(function (key) {
            var classes = 'jp-quiz-result-option';
            if (key === correct) {
              classes += ' is-correct';
            }
            if (selected === key && key !== correct) {
              classes += ' is-wrong';
            }
            return (
              '<div class="' +
              classes +
              '" style="border-color:' +
              OPTION_COLORS[key] +
              '">' +
              '<span class="jp-quiz-result-option__label">' +
              key +
              '</span> ' +
              formatDisplayText(question.options[key]) +
              '</div>'
            );
          })
          .join('')
      : '';
    var extraQuestion = isExtraQuestion(qIndex);
    return (
      '<section class="jp-quiz-screen jp-quiz-screen--results' +
      (extraQuestion ? ' jp-quiz-screen--extra' : '') +
      '">' +
      '<div class="jp-quiz-card">' +
      (extraQuestion
        ? '<div class="jp-quiz-extra-banner jp-quiz-extra-banner--compact">' +
          '<span class="jp-quiz-extra-banner__label">Extra</span>' +
          '<span class="jp-quiz-extra-banner__sub">Resultado da pergunta bônus</span>' +
          '</div>'
        : '<p class="jp-quiz-kicker">' +
          formatQuestionResultTitle(qIndex) +
          '</p>') +
      (!isHost
        ? '<div class="jp-quiz-points' +
          feedbackClass +
          '" data-points="' +
          points +
          '">' +
          (myAnswer && myAnswer.is_correct ? formatPoints(points) : '0 pts') +
          '</div>'
        : '') +
      '<div class="jp-quiz-result-options">' +
      optionsHtml +
      '</div>' +
      '</div>' +
      '<div class="jp-quiz-rank jp-quiz-rank--panel">' +
      '<h3 class="jp-quiz-rank__title">Ranking da pergunta</h3>' +
      renderQuestionRankingRows(qIndex, playerId, 10) +
      (!isHost && playerRecord
        ? '<p class="jp-quiz-rank__me">Sua posição: <strong>#' +
          getQuestionRankPosition(qIndex, playerRecord.id) +
          '</strong></p>'
        : '') +
      '</div>' +
      renderHostPanel() +
      '</section>'
    );
  }

  function renderPodium(list) {
    var top = sortPlayers(list).slice(0, 3);
    while (top.length < 3) {
      top.push(null);
    }
    return (
      '<div class="jp-quiz-podium">' +
      [1, 0, 2]
        .map(function (slotIndex, displayOrder) {
          var player = top[slotIndex];
          var place = slotIndex + 1;
          var heights = ['jp-quiz-podium__item--second', 'jp-quiz-podium__item--first', 'jp-quiz-podium__item--third'];
          if (!player) {
            return (
              '<div class="jp-quiz-podium__item ' +
              heights[displayOrder] +
              ' jp-quiz-podium__item--empty"><span>—</span></div>'
            );
          }
          return (
            '<div class="jp-quiz-podium__item ' +
            heights[displayOrder] +
            '">' +
            '<span class="jp-quiz-podium__medal">' +
            (place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉') +
            '</span>' +
            renderPlayerAvatar(player, 'jp-quiz-podium__avatar') +
            '<strong>' +
            escapeHtml(player.display_name) +
            '</strong>' +
            '<span>' +
            player.total_score.toLocaleString('pt-BR') +
            ' pts</span>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function launchConfettiBurst(count, light) {
    if (!fxNode) {
      return;
    }
    var total = light ? count : count || 72;
    for (var i = 0; i < total; i += 1) {
      var piece = document.createElement('span');
      piece.className = 'jp-quiz-confetti' + (light ? ' jp-quiz-confetti--light' : '');
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = AVATAR_COLORS[i % AVATAR_COLORS.length];
      piece.style.animationDelay = Math.random() * (light ? 0.4 : 1.2) + 's';
      piece.style.animationDuration = (light ? 1.8 : 2.4) + Math.random() * 1.8 + 's';
      piece.style.width = 6 + Math.floor(Math.random() * 8) + 'px';
      piece.style.height = 10 + Math.floor(Math.random() * 12) + 'px';
      fxNode.appendChild(piece);
      window.setTimeout(
        function (node) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        },
        light ? 3200 : 5200,
        piece
      );
    }
  }

  function launchConfetti() {
    if (confettiDone || !fxNode) {
      return;
    }
    confettiDone = true;
    launchConfettiBurst(72, false);
  }

  function maybeLaunchResultsConfetti() {
    if (!session || session.status !== 'results' || !playerId || !fxNode) {
      return;
    }
    var qIndex = getCurrentQuestionIndex();
    if (lastResultsConfettiQ === qIndex) {
      return;
    }
    var myAnswer = getPlayerAnswer(qIndex, playerId);
    if (myAnswer && myAnswer.is_correct) {
      lastResultsConfettiQ = qIndex;
      launchConfettiBurst(28, true);
    }
  }

  function animatePointsCounter(node) {
    if (!node) {
      return;
    }
    var target = parseInt(node.getAttribute('data-points') || '0', 10);
    if (!target) {
      return;
    }
    var started = performance.now();
    var duration = 900;
    function tick(now) {
      var progress = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatPoints(Math.round(target * eased));
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    }
    node.textContent = formatPoints(0);
    window.requestAnimationFrame(tick);
  }

  function runScreenAnimations() {
    if (!stageNode || !session) {
      return;
    }
    if (session.status === 'results') {
      if (!isHost) {
        animatePointsCounter(stageNode.querySelector('.jp-quiz-points.is-correct'));
      }
      window.setTimeout(maybeLaunchResultsConfetti, 350);
    }
    if (session.status === 'finished') {
      window.setTimeout(launchConfetti, 500);
    }
  }

  function ensureStageNodes() {
    if (!appNode) {
      return;
    }
    if (!stageNode || !fxNode) {
      appNode.innerHTML =
        '<div class="jp-quiz-stage"></div><div class="jp-quiz-fx" aria-hidden="true"></div>';
      stageNode = appNode.querySelector('.jp-quiz-stage');
      fxNode = appNode.querySelector('.jp-quiz-fx');
    }
  }

  function renderFinished() {
    return (
      '<section class="jp-quiz-screen jp-quiz-screen--finished">' +
      '<div class="jp-quiz-card">' +
      '<p class="jp-quiz-kicker">Quiz encerrado</p>' +
      '<h2 class="jp-quiz-title">Pódio final</h2>' +
      renderPodium(players) +
      '</div>' +
      '<div class="jp-quiz-rank jp-quiz-rank--panel">' +
      '<h3 class="jp-quiz-rank__title">Ranking final</h3>' +
      renderRankingRows(players, playerId, 10) +
      '</div>' +
      renderHostPanel() +
      '</section>'
    );
  }

  function getPhaseKey() {
    if (!session) {
      return '';
    }
    return (
      session.status +
      ':' +
      session.current_question +
      ':' +
      (session.question_started_at || '')
    );
  }

  function getRenderSignature() {
    if (!session) {
      return '';
    }
    var qIndex = session.current_question;
    var playerSig = players
      .map(function (player) {
        return (
          player.id +
          ':' +
          player.total_score +
          ':' +
          (player.avatar_photo ? '1' : '0')
        );
      })
      .join('|');
    var myAnswer = playerId ? getPlayerAnswer(qIndex, playerId) : null;
    var myAnswerSig = myAnswer
      ? myAnswer.selected_option + ':' + myAnswer.points_earned
      : 'none';
    var questionAnswerSig = answers
      .filter(function (answer) {
        return answer.question_index === qIndex;
      })
      .map(function (answer) {
        return answer.player_id + ':' + answer.points_earned;
      })
      .sort()
      .join('|');
    return [
      session.status,
      qIndex,
      session.question_started_at || '',
      players.length,
      playerSig,
      answers.length,
      myAnswerSig,
      questionAnswerSig,
    ].join('::');
  }

  function scheduleRender(forceFullRender) {
    if (renderTimer) {
      window.clearTimeout(renderTimer);
    }
    renderTimer = window.setTimeout(function () {
      renderTimer = null;
      renderApp(Boolean(forceFullRender));
    }, 50);
  }

  function scheduleSync(forceFullRender) {
    if (syncTimer) {
      window.clearTimeout(syncTimer);
    }
    syncTimer = window.setTimeout(function () {
      syncTimer = null;
      syncFromServer(forceFullRender);
    }, 100);
  }

  function syncFromServer(forceFullRender) {
    if (!session || syncInFlight) {
      syncQueued = true;
      return;
    }
    syncInFlight = true;
    Promise.all([loadPlayers(), loadAnswers()])
      .then(function () {
        renderApp(Boolean(forceFullRender));
      })
      .finally(function () {
        syncInFlight = false;
        if (syncQueued) {
          syncQueued = false;
          scheduleSync(forceFullRender);
        }
      });
  }

  function mergePlayerRecord(existing, incoming) {
    if (!incoming) {
      return existing || null;
    }
    if (!existing) {
      return incoming;
    }
    var merged = Object.assign({}, existing, incoming);
    if (!safePhotoSrc(incoming.avatar_photo) && safePhotoSrc(existing.avatar_photo)) {
      merged.avatar_photo = existing.avatar_photo;
    }
    return merged;
  }

  function applyPlayersPayload(payload) {
    if (!payload) {
      return;
    }
    if (payload.eventType === 'INSERT' && payload.new) {
      var insertIndex = -1;
      for (var i = 0; i < players.length; i += 1) {
        if (players[i].id === payload.new.id) {
          insertIndex = i;
          break;
        }
      }
      if (insertIndex === -1) {
        players.push(payload.new);
      } else {
        players[insertIndex] = mergePlayerRecord(players[insertIndex], payload.new);
      }
      return;
    }
    if (payload.eventType === 'UPDATE' && payload.new) {
      var updateFound = false;
      players = players.map(function (player) {
        if (player.id !== payload.new.id) {
          return player;
        }
        updateFound = true;
        return mergePlayerRecord(player, payload.new);
      });
      if (!updateFound) {
        players.push(payload.new);
      }
      if (playerId === payload.new.id) {
        playerRecord =
          players.find(function (player) {
            return player.id === payload.new.id;
          }) || playerRecord;
      }
      return;
    }
    if (payload.eventType === 'DELETE' && payload.old) {
      players = players.filter(function (player) {
        return player.id !== payload.old.id;
      });
      if (playerId === payload.old.id) {
        playerId = null;
        playerRecord = null;
        clearStoredPlayer();
      }
    }
  }

  function applyAnswersPayload(payload) {
    if (!payload) {
      return;
    }
    if (payload.eventType === 'INSERT' && payload.new) {
      answers = answers.filter(function (answer) {
        return !(
          String(answer.id).indexOf('local-') === 0 &&
          answer.player_id === payload.new.player_id &&
          answer.question_index === payload.new.question_index
        );
      });
      var hasAnswer = answers.some(function (answer) {
        return answer.id === payload.new.id;
      });
      if (!hasAnswer) {
        answers.push(payload.new);
      }
      return;
    }
    if (payload.eventType === 'UPDATE' && payload.new) {
      answers = answers.map(function (answer) {
        return answer.id === payload.new.id ? payload.new : answer;
      });
      return;
    }
    if (payload.eventType === 'DELETE' && payload.old) {
      answers = answers.filter(function (answer) {
        return answer.id !== payload.old.id;
      });
    }
  }

  function patchLiveFields() {
    if (!appNode || !session) {
      return;
    }
    patchPlayersCountBadge();
    var hostRank = appNode.querySelector('.jp-quiz-host__rank');
    if (hostRank) {
      var qIndex = getCurrentQuestionIndex();
      hostRank.innerHTML = shouldUseQuestionRanking()
        ? renderQuestionRankingRows(qIndex, null, 10)
        : renderRankingRows(players, null, 10);
    }
    var hostRankLabel = appNode.querySelector('.jp-quiz-host__rank-label');
    if (hostRankLabel) {
      hostRankLabel.textContent = shouldUseQuestionRanking()
        ? 'Ranking da pergunta'
        : 'Jogadores na sala';
    }
    var rankPanel = appNode.querySelector('.jp-quiz-rank--panel');
    if (rankPanel && session.status === 'results') {
      var resultsQIndex = getCurrentQuestionIndex();
      var myAnswer = playerId ? getPlayerAnswer(resultsQIndex, playerId) : null;
      var points = myAnswer ? myAnswer.points_earned : 0;
      var rankHtml =
        '<h3 class="jp-quiz-rank__title">Ranking da pergunta</h3>' +
        renderQuestionRankingRows(resultsQIndex, playerId, 10);
      if (playerRecord && !isHost) {
        rankHtml +=
          '<p class="jp-quiz-rank__me">Sua posição: <strong>#' +
          getQuestionRankPosition(resultsQIndex, playerRecord.id) +
          '</strong></p>';
      }
      rankPanel.innerHTML = rankHtml;
      if (!isHost) {
        var pointsNode = appNode.querySelector('.jp-quiz-points');
        if (pointsNode && myAnswer) {
          pointsNode.textContent = myAnswer.is_correct ? formatPoints(points) : '0 pts';
          pointsNode.classList.toggle('is-correct', myAnswer.is_correct);
          pointsNode.classList.toggle('is-wrong', !myAnswer.is_correct);
        }
      }
    }
    if (session.status === 'finished') {
      var finishedRank = appNode.querySelector('.jp-quiz-rank--panel');
      if (finishedRank) {
        finishedRank.innerHTML =
          '<h3 class="jp-quiz-rank__title">Ranking final</h3>' +
          renderRankingRows(players, playerId, 10);
      }
      var podium = appNode.querySelector('.jp-quiz-podium');
      if (podium) {
        podium.outerHTML = renderPodium(players);
      }
    }
    if (session.status === 'question' && playerId) {
      var qIndex = getCurrentQuestionIndex();
      var myAnswer = getPlayerAnswer(qIndex, playerId);
      if (myAnswer) {
        appNode.querySelectorAll('.jp-quiz-option').forEach(function (button) {
          var option = button.getAttribute('data-option');
          button.disabled = true;
          button.classList.add('is-locked');
          button.classList.toggle('is-selected', option === myAnswer.selected_option);
        });
      }
    }
  }

  function renderApp(forceFullRender) {
    if (!appNode || !session) {
      return;
    }
    var signature = getRenderSignature();
    var phaseKey = getPhaseKey();
    var phaseChanged = phaseKey !== lastPhaseKey;
    if (!forceFullRender && signature === lastRenderSignature) {
      return;
    }
    if (
      !forceFullRender &&
      !phaseChanged &&
      (session.status === 'question' || session.status === 'results' || session.status === 'lobby')
    ) {
      lastRenderSignature = signature;
      patchLiveFields();
      return;
    }
    lastPhaseKey = phaseKey;
    lastRenderSignature = signature;
    var html = '';
    if (session.status === 'lobby') {
      html = renderLobby();
      stopTimer();
      resetAutoHostFlow();
    } else if (session.status === 'question') {
      html = renderQuestionScreen(getRemainingMs());
      stopTimer();
      startTimer(function (remainingMs) {
        if (!appNode || !session || session.status !== 'question') {
          stopTimer();
          return;
        }
        var timerNode = appNode.querySelector('.jp-quiz-timer');
        if (!timerNode) {
          return;
        }
        updateTimerDisplay(remainingMs);
        if (remainingMs <= 0) {
          appNode.querySelectorAll('.jp-quiz-option').forEach(function (button) {
            button.disabled = true;
            button.classList.add('is-locked');
          });
        }
      });
      startAdvanceLoop();
      runAutoAdvance();
    } else if (session.status === 'results') {
      html = renderResultsScreen();
      stopTimer();
      startAdvanceLoop();
      runAutoAdvance();
    } else if (session.status === 'finished') {
      html = renderFinished();
      stopTimer();
      resetAutoHostFlow();
    }
    ensureStageNodes();
    if (stageNode) {
      stageNode.innerHTML = html;
      runScreenAnimations();
      var nameInput = appNode.querySelector('#jp-quiz-name');
      if (nameInput) {
        updateJoinFormForHost(nameInput.value.trim());
      }
    }
  }

  function bindScreenEvents() {
    if (!appNode || eventsBound) {
      return;
    }
    eventsBound = true;
    appNode.addEventListener('submit', function (event) {
      var form = event.target;
      if (form && form.id === 'jp-quiz-join-form') {
        handleJoin(event);
      }
    });
    appNode.addEventListener('change', function (event) {
      if (event.target && event.target.id === 'jp-quiz-photo') {
        handlePhotoSelect(event);
      }
      if (event.target && event.target.id === 'jp-quiz-duration') {
        handleDurationChange(event);
      }
    });
    appNode.addEventListener('input', function (event) {
      if (event.target && event.target.id === 'jp-quiz-name') {
        pendingPlayerName = event.target.value;
        updateJoinFormForHost(event.target.value.trim());
      }
    });
    appNode.addEventListener('click', function (event) {
      var optionButton = event.target.closest('[data-option]');
      if (optionButton && !optionButton.disabled) {
        submitAnswer(optionButton.getAttribute('data-option'));
        return;
      }
      var hostButton = event.target.closest('[data-host-action]');
      if (hostButton && !hostButton.disabled) {
        hostAction(hostButton.getAttribute('data-host-action'));
        return;
      }
      var leaveButton = event.target.closest('[data-quiz-action="leave"]');
      if (leaveButton) {
        leaveQuiz();
      }
    });
  }

  function leaveQuiz() {
    if (!session || session.status !== 'lobby') {
      return;
    }
    if (isHost) {
      clearStoredPlayer();
      setHostMode(false);
      renderApp(true);
      return;
    }
    if (!supabaseClient || !playerId) {
      playerRecord = null;
      pendingAvatarPhoto = null;
      pendingPlayerName = '';
      clearStoredPlayer();
      renderApp(true);
      return;
    }
    var leavingId = playerId;
    supabaseClient
      .from('quiz_players')
      .delete()
      .eq('id', leavingId)
      .then(function (result) {
        if (result.error) {
          window.alert('Não foi possível sair. Tente novamente.');
          return;
        }
        playerId = null;
        playerRecord = null;
        pendingAvatarPhoto = null;
        pendingPlayerName = '';
        clearStoredPlayer();
        applyPlayersPayload({ eventType: 'DELETE', old: { id: leavingId } });
        scheduleRender(true);
      });
  }

  function syncPendingPlayerName() {
    if (!appNode) {
      return;
    }
    var input = appNode.querySelector('#jp-quiz-name');
    if (input) {
      pendingPlayerName = input.value;
    }
  }

  function updateJoinFormForHost(name) {
    if (!appNode) {
      return;
    }
    var form = appNode.querySelector('#jp-quiz-join-form');
    if (!form) {
      return;
    }
    form.classList.toggle('jp-quiz-join--host-name', isHostName(name));
  }

  function handleDurationChange(event) {
    if (!isHost || !session || session.status !== 'lobby') {
      return;
    }
    var input = event.target;
    var seconds = parseInt(input.value, 10);
    if (!seconds || seconds < MIN_QUESTION_SECONDS || seconds > MAX_QUESTION_SECONDS) {
      input.value = String(getQuestionDurationSeconds());
      return;
    }
    if (seconds === getQuestionDurationSeconds()) {
      return;
    }
    hostAction('set_duration', seconds);
  }

  function handlePhotoSelect(event) {
    var input = event.target;
    var file = input && input.files ? input.files[0] : null;
    if (!file) {
      return;
    }
    compressAvatarFile(file).then(function (photo) {
      syncPendingPlayerName();
      pendingAvatarPhoto = photo;
      var photoWrap = appNode.querySelector('.jp-quiz-join__photo');
      if (photoWrap) {
        photoWrap.innerHTML =
          '<img class="jp-quiz-join__preview" src="' +
          safePhotoSrc(photo) +
          '" alt="" />' +
          '<label class="jp-quiz-join__photo-btn">' +
          '<input id="jp-quiz-photo" type="file" accept="image/*" capture="user" hidden />' +
          renderBtnIcon('photo') +
          '<span class="jp-quiz-btn__label">Tirar / escolher foto</span></label>';
        return;
      }
      renderApp(true);
    });
  }

  function handleJoin(event) {
    event.preventDefault();
    if (!session || playerRecord || joinInFlight) {
      return;
    }
    var input = appNode.querySelector('#jp-quiz-name');
    var name = input ? input.value.trim() : '';
    if (!name) {
      return;
    }
    if (!isHostName(name) && !pendingAvatarPhoto) {
      window.alert('Adicione sua foto para entrar no quiz.');
      return;
    }
    joinPlayer(name, pendingAvatarPhoto);
  }

  function joinPlayer(name, avatarPhoto) {
    if (!supabaseClient || !session || joinInFlight) {
      return;
    }
    joinInFlight = true;
    if (isHostName(name)) {
      setHostMode(true);
      writeStoredPlayer({
        sessionId: session.id,
        displayName: name,
        isHost: true,
      });
      joinInFlight = false;
      renderApp(true);
      return;
    }
    if (!avatarPhoto) {
      joinInFlight = false;
      window.alert('Adicione sua foto para entrar no quiz.');
      return;
    }
    var payload = {
      session_id: session.id,
      display_name: name,
      avatar_color: pickAvatarColor(name),
      avatar_photo: avatarPhoto,
    };
    supabaseClient
      .from('quiz_players')
      .insert(payload)
      .select('*')
      .single()
      .then(function (result) {
        joinInFlight = false;
        if (result.error) {
          window.alert('Não foi possível entrar. Talvez esse nome já exista.');
          return;
        }
        playerId = result.data.id;
        playerRecord = result.data;
        pendingAvatarPhoto = null;
        pendingPlayerName = '';
        writeStoredPlayer({
          id: playerId,
          sessionId: session.id,
          displayName: name,
        });
        applyPlayersPayload({ eventType: 'INSERT', new: result.data });
        scheduleRender(true);
      })
      .catch(function () {
        joinInFlight = false;
      });
  }

  function submitAnswer(option) {
    if (!supabaseClient || !session || !playerId || session.status !== 'question' || answerInFlight) {
      return;
    }
    var qIndex = getCurrentQuestionIndex();
    if (getPlayerAnswer(qIndex, playerId)) {
      return;
    }
    if (getRemainingMs() <= 0) {
      return;
    }
    answerInFlight = true;
    var pickedButton = appNode.querySelector('[data-option="' + option + '"]');
    if (pickedButton) {
      pickedButton.classList.add('is-picked', 'is-selected');
      appNode.querySelectorAll('.jp-quiz-option').forEach(function (button) {
        if (button !== pickedButton) {
          button.disabled = true;
          button.classList.add('is-locked');
        }
      });
    }
    var payload = {
      player_id: playerId,
      session_id: session.id,
      question_index: qIndex,
      selected_option: option,
      response_time_ms: getElapsedMs(),
    };
    answers.push({
      id: 'local-' + Date.now(),
      player_id: playerId,
      session_id: session.id,
      question_index: qIndex,
      selected_option: option,
      response_time_ms: payload.response_time_ms,
      is_correct: false,
      points_earned: 0,
    });
    scheduleRender();
    supabaseClient.from('quiz_answers').insert(payload).then(function (result) {
      answerInFlight = false;
      if (result.error) {
        answers = answers.filter(function (answer) {
          return !(
            String(answer.id).indexOf('local-') === 0 &&
            answer.player_id === playerId &&
            answer.question_index === qIndex
          );
        });
        scheduleRender(true);
        return;
      }
      scheduleSync();
    }).catch(function () {
      answerInFlight = false;
    });
  }

  function clearHostClientState(exitHostMode) {
    confettiDone = false;
    lastResultsConfettiQ = -1;
    resetAutoHostFlow();
    playerId = null;
    playerRecord = null;
    joinInFlight = false;
    answerInFlight = false;
    lastRenderSignature = '';
    lastPhaseKey = '';
    pendingAvatarPhoto = null;
    pendingPlayerName = '';
    clearStoredPlayer();
    if (exitHostMode) {
      setHostMode(false);
    }
  }

  function hostAction(action, value) {
    if (!isHost || !supabaseClient) {
      return;
    }
    var exitToLobby = action === 'finish' && session && session.status === 'finished';
    var rpcAction = exitToLobby ? 'reset' : action;
    if (action === 'reset' && !window.confirm('Reiniciar apaga jogadores e pontuações. Continuar?')) {
      return;
    }
    supabaseClient
      .rpc('quiz_host_action', {
        p_pin: HOST_PIN,
        p_action: rpcAction,
        p_value: value == null ? null : value,
      })
      .then(function (result) {
      if (result.error) {
        window.alert('Ação do host falhou.');
        return;
      }
      if (action === 'set_duration' && value != null) {
        if (session) {
          session.question_duration_ms = value * 1000;
        }
        return;
      }
      if (action === 'reset') {
        clearHostClientState(false);
        scheduleSync(true);
        return;
      }
      if (exitToLobby) {
        clearHostClientState(true);
        scheduleSync(true);
        return;
      }
      if (action === 'finish') {
        resetAutoHostFlow();
        scheduleSync(true);
      }
    });
  }

  function loadSession() {
    return supabaseClient
      .from('quiz_sessions')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
      .then(function (result) {
        if (result.data) {
          session = result.data;
        }
        return session;
      });
  }

  function loadPlayers() {
    if (!session) {
      return Promise.resolve([]);
    }
    return supabaseClient
      .from('quiz_players')
      .select('*')
      .eq('session_id', session.id)
      .then(function (result) {
        players = result.data || [];
        if (playerId) {
          playerRecord = players.find(function (item) {
            return item.id === playerId;
          }) || playerRecord;
        }
        return players;
      });
  }

  function loadAnswers() {
    if (!session) {
      return Promise.resolve([]);
    }
    return supabaseClient
      .from('quiz_answers')
      .select('*')
      .eq('session_id', session.id)
      .then(function (result) {
        answers = result.data || [];
        return answers;
      });
  }

  function subscribeRealtime() {
    if (!session || channel) {
      return;
    }
    channel = supabaseClient
      .channel('jp-quiz-' + session.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_sessions', filter: 'id=eq.' + session.id },
        function (payload) {
          if (!payload.new) {
            return;
          }
          session = payload.new;
          scheduleRender(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_players', filter: 'session_id=eq.' + session.id },
        function (payload) {
          applyPlayersPayload(payload);
          scheduleRender();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_answers', filter: 'session_id=eq.' + session.id },
        function (payload) {
          applyAnswersPayload(payload);
          scheduleRender();
        }
      )
      .subscribe();
  }

  function loadQuestions() {
    return window
      .fetch('media/jp/quiz-questions.json')
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        questions = data.questions || [];
      })
      .catch(function () {
        questions = [];
      });
  }

  function init(node) {
    appNode = node;
    ensureStageNodes();
    document.documentElement.classList.add('jp-quiz-active');
    bindScreenEvents();

    if (!window.supabase || !window.supabase.createClient) {
      appNode.innerHTML = '<p class="jp-quiz-empty">Supabase não carregou.</p>';
      return;
    }

    var config = getConfig();
    supabaseClient = window.supabase.createClient(config.url, config.key);

    Promise.all([loadQuestions(), loadSession()])
      .then(function () {
        if (!session) {
          appNode.innerHTML = '<p class="jp-quiz-empty">Sessão do quiz não encontrada.</p>';
          return null;
        }
        if (session.status === 'finished') {
          confettiDone = false;
          lastResultsConfettiQ = -1;
          resetAutoHostFlow();
          return supabaseClient
            .rpc('quiz_host_action', { p_pin: HOST_PIN, p_action: 'reset' })
            .then(function (result) {
              if (result.error) {
                return null;
              }
              return loadSession();
            });
        }
        return session;
      })
      .then(function (activeSession) {
        if (!activeSession) {
          return null;
        }
        return restorePlayer();
      })
      .then(function () {
        if (!session) {
          return null;
        }
        return Promise.all([loadPlayers(), loadAnswers()]);
      })
      .then(function () {
        if (!session) {
          return;
        }
        subscribeRealtime();
        renderApp(true);
      });
  }

  window.JpQuiz = {
    init: init,
  };
})(window);
