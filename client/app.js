// SofaBiwenger Stats App Client Logic
const DEFAULT_LEAGUES = [
  { id: 8, name: "LaLiga EA Sports", country: "España", flag: "es", logo: "https://api.sofascore.app/api/v1/unique-tournament/8/image" },
  { id: 17, name: "Premier League", country: "Inglaterra", flag: "gb-eng", logo: "https://api.sofascore.app/api/v1/unique-tournament/17/image" },
  { id: 23, name: "Serie A", country: "Italia", flag: "it", logo: "https://api.sofascore.app/api/v1/unique-tournament/23/image" },
  { id: 35, name: "Bundesliga", country: "Alemania", flag: "de", logo: "https://api.sofascore.app/api/v1/unique-tournament/35/image" },
  { id: 34, name: "Ligue 1", country: "Francia", flag: "fr", logo: "https://api.sofascore.app/api/v1/unique-tournament/34/image" },
  { id: 7, name: "UEFA Champions League", country: "Europa", flag: "eu", logo: "https://api.sofascore.app/api/v1/unique-tournament/7/image" },
  { id: 54, name: "LaLiga Hypermotion", country: "España", flag: "es", logo: "https://api.sofascore.app/api/v1/unique-tournament/54/image" },
  { id: 238, name: "Liga Portugal", country: "Portugal", flag: "pt", logo: "https://api.sofascore.app/api/v1/unique-tournament/238/image" }
];

const state = {
  metric: 'sofascore', // 'sofascore' | 'biwenger'
  leagues: DEFAULT_LEAGUES,
  selectedLeagueId: 8, // LaLiga default
  teams: [],
  selectedTeamId: null,
  players: [],
  positionFilter: 'ALL',
  sortBy: 'rating_1m',
  liveMatches: [],
  activePlayerStats: null
};

// DOM Elements
const elements = {
  leaguesBar: document.getElementById('leaguesBar'),
  teamSelect: document.getElementById('teamSelect'),
  posChips: document.querySelectorAll('.pos-chip'),
  sortSelect: document.getElementById('sortSelect'),
  refreshTeamBtn: document.getElementById('refreshTeamBtn'),
  squadTableBody: document.getElementById('squadTableBody'),
  tableLoadingState: document.getElementById('tableLoadingState'),
  currentTeamTitle: document.getElementById('currentTeamTitle'),
  currentTeamLogo: document.getElementById('currentTeamLogo'),
  playersCountBadge: document.getElementById('playersCountBadge'),
  
  toggleSofascore: document.getElementById('toggleSofascore'),
  toggleBiwenger: document.getElementById('toggleBiwenger'),
  currentMetricNames: document.querySelectorAll('.current-metric-name'),

  viewStatsBtn: document.getElementById('viewStatsBtn'),
  viewLiveBtn: document.getElementById('viewLiveBtn'),
  statsView: document.getElementById('statsView'),
  liveView: document.getElementById('liveView'),
  liveCountBadge: document.getElementById('liveCountBadge'),
  liveMatchesGrid: document.getElementById('liveMatchesGrid'),
  refreshLiveBtn: document.getElementById('refreshLiveBtn'),
  liveMatchDetails: document.getElementById('liveMatchDetails'),
  closeLiveDetailsBtn: document.getElementById('closeLiveDetailsBtn'),
  liveLineupsContainer: document.getElementById('liveLineupsContainer'),

  searchInput: document.getElementById('playerSearchInput'),
  searchSpinner: document.getElementById('searchSpinner'),
  searchResultsDropdown: document.getElementById('searchResultsDropdown'),

  // Modal
  playerModal: document.getElementById('playerModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  modalLoading: document.getElementById('modalLoading'),
  modalContent: document.getElementById('modalContent'),
  modalPlayerPhoto: document.getElementById('modalPlayerPhoto'),
  modalPlayerName: document.getElementById('modalPlayerName'),
  modalPlayerTeam: document.getElementById('modalPlayerTeam'),
  modalPlayerCountry: document.getElementById('modalPlayerCountry'),
  modalPlayerPosition: document.getElementById('modalPlayerPosition'),
  modalPlayerJersey: document.getElementById('modalPlayerJersey'),
  modalPlayerSofaId: document.getElementById('modalPlayerSofaId'),
  sofaAverage12mBadge: document.getElementById('sofaAverage12mBadge'),
  monthlyBarsChart: document.getElementById('monthlyBarsChart'),
  matchesHistoryTableBody: document.getElementById('matchesHistoryTableBody'),

  // Modal Window Stats
  pj_1m: document.getElementById('pj_1m'),
  rating_1m_val: document.getElementById('rating_1m_val'),
  goals_1m_val: document.getElementById('goals_1m_val'),
  goals_avg_1m: document.getElementById('goals_avg_1m'),
  assists_1m_val: document.getElementById('assists_1m_val'),
  min_1m_val: document.getElementById('min_1m_val'),

  pj_2m: document.getElementById('pj_2m'),
  rating_2m_val: document.getElementById('rating_2m_val'),
  goals_2m_val: document.getElementById('goals_2m_val'),
  goals_avg_2m: document.getElementById('goals_avg_2m'),
  assists_2m_val: document.getElementById('assists_2m_val'),
  min_2m_val: document.getElementById('min_2m_val'),

  pj_3m: document.getElementById('pj_3m'),
  rating_3m_val: document.getElementById('rating_3m_val'),
  goals_3m_val: document.getElementById('goals_3m_val'),
  goals_avg_3m: document.getElementById('goals_avg_3m'),
  assists_3m_val: document.getElementById('assists_3m_val'),
  min_3m_val: document.getElementById('min_3m_val'),

  pj_6m: document.getElementById('pj_6m'),
  rating_6m_val: document.getElementById('rating_6m_val'),
  goals_6m_val: document.getElementById('goals_6m_val'),
  goals_avg_6m: document.getElementById('goals_avg_6m'),
  assists_6m_val: document.getElementById('assists_6m_val'),
  min_6m_val: document.getElementById('min_6m_val'),

  pj_12m: document.getElementById('pj_12m'),
  rating_12m_val: document.getElementById('rating_12m_val'),
  goals_12m_val: document.getElementById('goals_12m_val'),
  goals_avg_12m: document.getElementById('goals_avg_12m'),
  assists_12m_val: document.getElementById('assists_12m_val'),
  min_12m_val: document.getElementById('min_12m_val')
};

// Helper: Format rating badge class
function getRatingClass(rating) {
  if (rating === null || rating === undefined) return 'score-empty';
  if (rating >= 7.5) return 'score-high';
  if (rating >= 7.0) return 'score-med-high';
  if (rating >= 6.5) return 'score-med';
  if (rating >= 6.0) return 'score-low-med';
  return 'score-low';
}

function getBiwengerClass(pts) {
  if (pts === null || pts === undefined) return 'score-empty';
  if (pts >= 6.0) return 'score-high';
  if (pts >= 4.5) return 'score-med-high';
  if (pts >= 3.0) return 'score-med';
  if (pts >= 1.5) return 'score-low-med';
  return 'score-low';
}

function getPositionName(pos) {
  const p = (pos || '').toUpperCase();
  if (p === 'G' || p === 'POR') return 'Portero';
  if (p === 'D' || p === 'DEF') return 'Defensa';
  if (p === 'M' || p === 'MED') return 'Centrocampista';
  if (p === 'F' || p === 'DEL') return 'Delantero';
  return pos || 'Jugador';
}

// 1. Initial Load
async function init() {
  bindEvents();
  renderLeaguesBar();
  await loadLeagues();
  checkLiveMatches();
  setInterval(checkLiveMatches, 30000); // Polling live matches every 30s
}

// 2. Bind UI Events
function bindEvents() {
  // Metric toggles
  elements.toggleSofascore.addEventListener('click', () => setMetric('sofascore'));
  elements.toggleBiwenger.addEventListener('click', () => setMetric('biwenger'));

  // View switch
  elements.viewStatsBtn.addEventListener('click', () => switchView('stats'));
  elements.viewLiveBtn.addEventListener('click', () => switchView('live'));

  // Team Select Change
  elements.teamSelect.addEventListener('change', (e) => {
    state.selectedTeamId = e.target.value;
    loadTeamSquad(state.selectedTeamId);
  });

  // Position Chips
  elements.posChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.posChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.positionFilter = chip.dataset.pos;
      renderSquadTable();
    });
  });

  // Sort Select
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderSquadTable();
  });

  // Refresh Team Btn
  elements.refreshTeamBtn.addEventListener('click', () => {
    if (state.selectedTeamId) loadTeamSquad(state.selectedTeamId);
  });

  // Refresh Live Btn
  elements.refreshLiveBtn.addEventListener('click', checkLiveMatches);

  // Close Live Details
  elements.closeLiveDetailsBtn.addEventListener('click', () => {
    elements.liveMatchDetails.classList.add('hidden');
  });

  // Modal close
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.playerModal.addEventListener('click', (e) => {
    if (e.target === elements.playerModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Search input debounced
  let debounceTimeout = null;
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearTimeout(debounceTimeout);
    if (val.length < 2) {
      elements.searchResultsDropdown.classList.add('hidden');
      elements.searchResultsDropdown.innerHTML = '';
      return;
    }
    elements.searchSpinner.classList.remove('hidden');
    debounceTimeout = setTimeout(() => searchPlayers(val), 350);
  });

  document.addEventListener('click', (e) => {
    if (!elements.searchInput.contains(e.target) && !elements.searchResultsDropdown.contains(e.target)) {
      elements.searchResultsDropdown.classList.add('hidden');
    }
  });
}

function setMetric(metric) {
  state.metric = metric;
  if (metric === 'sofascore') {
    elements.toggleSofascore.classList.add('active');
    elements.toggleBiwenger.classList.remove('active');
    elements.currentMetricNames.forEach(el => el.textContent = 'Nota');
  } else {
    elements.toggleBiwenger.classList.add('active');
    elements.toggleSofascore.classList.remove('active');
    elements.currentMetricNames.forEach(el => el.textContent = 'Pts Biw');
  }
  renderSquadTable();
  if (state.activePlayerStats) {
    updateModalStatsValues();
  }
}

function switchView(view) {
  if (view === 'stats') {
    elements.viewStatsBtn.classList.add('active');
    elements.viewLiveBtn.classList.remove('active');
    elements.statsView.classList.remove('hidden');
    elements.liveView.classList.add('hidden');
  } else {
    elements.viewLiveBtn.classList.add('active');
    elements.viewStatsBtn.classList.remove('active');
    elements.liveView.classList.remove('hidden');
    elements.statsView.classList.add('hidden');
    checkLiveMatches();
  }
}

// 3. Load Leagues
async function loadLeagues() {
  try {
    const res = await fetch('/api/leagues');
    const data = await res.json();
    if (data.success && data.leagues && data.leagues.length > 0) {
      state.leagues = data.leagues;
      renderLeaguesBar();
    }
  } catch (e) {
    console.warn('Using default leagues:', e);
  }
  selectLeague(state.selectedLeagueId || 8);
}

function renderLeaguesBar() {
  elements.leaguesBar.innerHTML = '';
  state.leagues.forEach(league => {
    const chip = document.createElement('button');
    chip.className = `league-chip ${league.id === state.selectedLeagueId ? 'active' : ''}`;
    chip.innerHTML = `
      <img class="league-logo" src="${league.logo}" alt="" onerror="this.style.display='none'">
      <span>${league.name}</span>
    `;
    chip.addEventListener('click', () => selectLeague(league.id));
    elements.leaguesBar.appendChild(chip);
  });
}

async function selectLeague(leagueId) {
  state.selectedLeagueId = leagueId;
  renderLeaguesBar();

  // Load teams for this league
  elements.teamSelect.innerHTML = '<option value="">Cargando equipos...</option>';
  try {
    const res = await fetch(`/api/leagues/${leagueId}/teams`);
    const data = await res.json();
    if (data.success && data.teams && data.teams.length > 0) {
      state.teams = data.teams;
      renderTeamSelect();
      let defaultTeam = state.teams.find(t => t.id === 2829) || state.teams[0];
      state.selectedTeamId = defaultTeam.id;
      elements.teamSelect.value = state.selectedTeamId;
      loadTeamSquad(state.selectedTeamId);
    } else {
      elements.teamSelect.innerHTML = '<option value="">No hay equipos disponibles</option>';
    }
  } catch (e) {
    console.error('Error loading teams:', e);
    elements.teamSelect.innerHTML = '<option value="">Error al cargar equipos</option>';
  }
}

function renderTeamSelect() {
  elements.teamSelect.innerHTML = '';
  state.teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.position ? t.position + '. ' : ''}${t.name}`;
    elements.teamSelect.appendChild(opt);
  });
}

// 4. Load Team Squad
async function loadTeamSquad(teamId) {
  if (!teamId) return;

  const currentTeam = state.teams.find(t => t.id == teamId);
  if (currentTeam) {
    elements.currentTeamTitle.textContent = currentTeam.name;
    elements.currentTeamLogo.src = currentTeam.logo;
    elements.currentTeamLogo.classList.remove('hidden');
  }

  elements.squadTableBody.innerHTML = '';
  elements.tableLoadingState.classList.remove('hidden');

  try {
    const res = await fetch(`/api/teams/${teamId}/stats`);
    const data = await res.json();
    elements.tableLoadingState.classList.add('hidden');

    if (data.success && data.players) {
      state.players = data.players;
      elements.playersCountBadge.textContent = `${state.players.length} jugadores`;
      renderSquadTable();
    }
  } catch (e) {
    elements.tableLoadingState.classList.add('hidden');
    console.error('Error loading squad stats:', e);
  }
}

// 5. Render Squad Table with Sorting and Position Filter
function renderSquadTable() {
  elements.squadTableBody.innerHTML = '';

  let filtered = [...state.players];

  // Filter by position
  if (state.positionFilter !== 'ALL') {
    filtered = filtered.filter(p => {
      const pos = (p.position || '').toUpperCase();
      if (state.positionFilter === 'POR') return pos === 'G' || pos === 'POR';
      if (state.positionFilter === 'DEF') return pos === 'D' || pos === 'DEF';
      if (state.positionFilter === 'MED') return pos === 'M' || pos === 'MED';
      if (state.positionFilter === 'DEL') return pos === 'F' || pos === 'DEL';
      return true;
    });
  }

  // Sort criteria
  const isSofa = state.metric === 'sofascore';
  filtered.sort((a, b) => {
    const aStats = a.stats?.windows || {};
    const bStats = b.stats?.windows || {};

    const getVal = (statsObj, field) => {
      if (field === 'rating_1m') return isSofa ? (statsObj.last1m?.avgRating || 0) : (statsObj.last1m?.avgBiwengerPoints || 0);
      if (field === 'rating_2m') return isSofa ? (statsObj.last2m?.avgRating || 0) : (statsObj.last2m?.avgBiwengerPoints || 0);
      if (field === 'rating_3m') return isSofa ? (statsObj.last3m?.avgRating || 0) : (statsObj.last3m?.avgBiwengerPoints || 0);
      if (field === 'rating_6m') return isSofa ? (statsObj.last6m?.avgRating || 0) : (statsObj.last6m?.avgBiwengerPoints || 0);
      if (field === 'rating_12m') return isSofa ? (statsObj.last12m?.avgRating || 0) : (statsObj.last12m?.avgBiwengerPoints || 0);
      if (field === 'goals_1m') return statsObj.last1m?.totalGoals || 0;
      if (field === 'goals_2m') return statsObj.last2m?.totalGoals || 0;
      if (field === 'goals_3m') return statsObj.last3m?.totalGoals || 0;
      if (field === 'goals_12m') return statsObj.last12m?.totalGoals || 0;
      return 0;
    };

    return getVal(bStats, state.sortBy) - getVal(aStats, state.sortBy);
  });

  if (filtered.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="18" style="text-align: center; padding: 40px; color: var(--text-muted);">No hay jugadores que coincidan con los filtros seleccionados.</td>`;
    elements.squadTableBody.appendChild(emptyRow);
    return;
  }

  filtered.forEach(player => {
    const tr = document.createElement('tr');
    const w = player.stats?.windows || {};

    const formatMetric = (win) => {
      if (!win || win.matchesCount === 0) return { val: '-', cls: 'score-empty' };
      const num = isSofa ? win.avgRating : win.avgBiwengerPoints;
      if (num === null || num === undefined) return { val: '-', cls: 'score-empty' };
      const cls = isSofa ? getRatingClass(num) : getBiwengerClass(num);
      return { val: num.toFixed(isSofa ? 2 : 1), cls };
    };

    const m1 = formatMetric(w.last1m);
    const m2 = formatMetric(w.last2m);
    const m3 = formatMetric(w.last3m);
    const m6 = formatMetric(w.last6m);
    const m12 = formatMetric(w.last12m);

    tr.innerHTML = `
      <td class="td-player-cell">
        <img class="player-img-table" src="${player.photo}" alt="${player.name}" onerror="this.src='https://api.sofascore.app/static/images/silhouette.png'">
        <div class="player-names">
          <span class="player-fullname">${player.name}</span>
          <span class="player-submeta">${player.jerseyNumber ? '#' + player.jerseyNumber + ' · ' : ''}${player.country || ''}</span>
        </div>
      </td>
      <td class="val-center">
        <span class="pos-badge pos-${player.position}">${player.position}</span>
      </td>

      <!-- 1M -->
      <td class="val-center">${w.last1m?.matchesCount ?? 0}</td>
      <td class="val-center"><span class="score-badge ${m1.cls}">${m1.val}</span></td>
      <td class="val-center">${w.last1m?.totalGoals ?? 0} / ${w.last1m?.totalAssists ?? 0}</td>

      <!-- 2M -->
      <td class="val-center">${w.last2m?.matchesCount ?? 0}</td>
      <td class="val-center"><span class="score-badge ${m2.cls}">${m2.val}</span></td>
      <td class="val-center">${w.last2m?.totalGoals ?? 0} / ${w.last2m?.totalAssists ?? 0}</td>

      <!-- 3M -->
      <td class="val-center">${w.last3m?.matchesCount ?? 0}</td>
      <td class="val-center"><span class="score-badge ${m3.cls}">${m3.val}</span></td>
      <td class="val-center">${w.last3m?.totalGoals ?? 0} / ${w.last3m?.totalAssists ?? 0}</td>

      <!-- 6M -->
      <td class="val-center">${w.last6m?.matchesCount ?? 0}</td>
      <td class="val-center"><span class="score-badge ${m6.cls}">${m6.val}</span></td>
      <td class="val-center">${w.last6m?.totalGoals ?? 0} / ${w.last6m?.totalAssists ?? 0}</td>

      <!-- 12M -->
      <td class="val-center">${w.last12m?.matchesCount ?? 0}</td>
      <td class="val-center"><span class="score-badge ${m12.cls}">${m12.val}</span></td>
      <td class="val-center">${w.last12m?.totalGoals ?? 0} / ${w.last12m?.totalAssists ?? 0}</td>

      <td class="val-center">
        <button class="action-btn-sm" onclick="openPlayerModal(${player.id}, '${player.position}')">Ver Ficha</button>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (!e.target.classList.contains('action-btn-sm')) {
        openPlayerModal(player.id, player.position);
      }
    });

    elements.squadTableBody.appendChild(tr);
  });
}

// 6. Player Search
async function searchPlayers(q) {
  try {
    const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    elements.searchSpinner.classList.add('hidden');

    if (data.success && data.results) {
      renderSearchResults(data.results);
    }
  } catch (e) {
    elements.searchSpinner.classList.add('hidden');
    console.error('Search error:', e);
  }
}

function renderSearchResults(players) {
  elements.searchResultsDropdown.innerHTML = '';
  if (players.length === 0) {
    elements.searchResultsDropdown.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem;">No se encontraron jugadores.</div>`;
    elements.searchResultsDropdown.classList.remove('hidden');
    return;
  }

  players.slice(0, 10).forEach(p => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <img class="search-item-photo" src="${p.photo}" onerror="this.src='https://api.sofascore.app/static/images/silhouette.png'">
      <div class="search-item-info">
        <div class="search-item-name">${p.name}</div>
        <div class="search-item-team">${p.team?.name || 'Equipo nacional'}</div>
      </div>
      <span class="search-item-pos">${p.position}</span>
    `;
    item.addEventListener('click', () => {
      elements.searchResultsDropdown.classList.add('hidden');
      elements.searchInput.value = '';
      openPlayerModal(p.id, p.position);
    });
    elements.searchResultsDropdown.appendChild(item);
  });

  elements.searchResultsDropdown.classList.remove('hidden');
}

// 7. Open Player Modal (Reproducing Screenshot)
async function openPlayerModal(playerId, position = 'F') {
  elements.playerModal.classList.remove('hidden');
  elements.modalLoading.classList.remove('hidden');
  elements.modalContent.classList.add('hidden');

  try {
    const res = await fetch(`/api/players/${playerId}/stats?pos=${position}`);
    const data = await res.json();
    elements.modalLoading.classList.add('hidden');

    if (data.success) {
      state.activePlayerStats = data;
      renderModalContent(data);
    }
  } catch (e) {
    elements.modalLoading.innerHTML = `<p style="color: #ef4444;">Error cargando estadísticas del jugador.</p>`;
    console.error(e);
  }
}

function renderModalContent(data) {
  const p = data.player || {};
  const stats = data.stats || {};
  const w = stats.windows || {};

  elements.modalPlayerPhoto.src = `https://api.sofascore.app/api/v1/player/${p.id}/image`;
  elements.modalPlayerPhoto.onerror = () => {
    elements.modalPlayerPhoto.src = 'https://api.sofascore.app/static/images/silhouette.png';
  };
  elements.modalPlayerName.textContent = p.name || 'Jugador';
  elements.modalPlayerTeam.textContent = p.team?.name || 'Sin equipo';
  elements.modalPlayerCountry.textContent = p.country?.name || 'Internacional';
  elements.modalPlayerPosition.textContent = getPositionName(p.position);
  elements.modalPlayerJersey.textContent = p.jerseyNumber ? `#${p.jerseyNumber}` : '-';
  elements.modalPlayerSofaId.textContent = p.sofascoreId || `id:${p.id}`;

  // Update window values
  updateModalStatsValues();

  // 12M Sofascore Rating Badge (as shown in screenshot)
  const avg12m = w.last12m?.avgRating || stats.windows?.overall?.avgRating || 0;
  elements.sofaAverage12mBadge.textContent = avg12m ? avg12m.toFixed(2) : '-';

  // Render 12 Months Bar Chart
  renderMonthlyBarChart(stats.monthlyBreakdown || []);

  // Render Matches History
  renderMatchesHistory(stats.recentMatches || []);

  elements.modalContent.classList.remove('hidden');
}

function updateModalStatsValues() {
  if (!state.activePlayerStats) return;
  const w = state.activePlayerStats.stats?.windows || {};
  const isSofa = state.metric === 'sofascore';

  const updateCard = (elPJ, elRating, elGoals, elGoalsAvg, elAssists, elMin, win) => {
    const pj = win?.matchesCount || 0;
    elPJ.textContent = `${pj} ${pj === 1 ? 'partido' : 'partidos'}`;

    const score = isSofa ? win?.avgRating : win?.avgBiwengerPoints;
    if (score !== null && score !== undefined && pj > 0) {
      elRating.textContent = score.toFixed(isSofa ? 2 : 1);
      elRating.className = `score-badge ${isSofa ? getRatingClass(score) : getBiwengerClass(score)}`;
    } else {
      elRating.textContent = '-';
      elRating.className = 'score-badge score-empty';
    }

    elGoals.textContent = win?.totalGoals || 0;
    elGoalsAvg.textContent = win?.avgGoals ? win.avgGoals.toFixed(1) : '0.0';
    elAssists.textContent = win?.totalAssists || 0;
    elMin.textContent = win?.avgMinutes ? `${win.avgMinutes}'` : "0'";
  };

  updateCard(elements.pj_1m, elements.rating_1m_val, elements.goals_1m_val, elements.goals_avg_1m, elements.assists_1m_val, elements.min_1m_val, w.last1m);
  updateCard(elements.pj_2m, elements.rating_2m_val, elements.goals_2m_val, elements.goals_avg_2m, elements.assists_2m_val, elements.min_2m_val, w.last2m);
  updateCard(elements.pj_3m, elements.rating_3m_val, elements.goals_3m_val, elements.goals_avg_3m, elements.assists_3m_val, elements.min_3m_val, w.last3m);
  updateCard(elements.pj_6m, elements.rating_6m_val, elements.goals_6m_val, elements.goals_avg_6m, elements.assists_6m_val, elements.min_6m_val, w.last6m);
  updateCard(elements.pj_12m, elements.rating_12m_val, elements.goals_12m_val, elements.goals_avg_12m, elements.assists_12m_val, elements.min_12m_val, w.last12m);
}

// 8. Render Monthly Bar Chart (Screenshot Match)
function renderMonthlyBarChart(monthlyData) {
  elements.monthlyBarsChart.innerHTML = '';

  if (!monthlyData || monthlyData.length === 0) {
    elements.monthlyBarsChart.innerHTML = '<div style="margin: auto; color: var(--text-muted);">Sin datos en los últimos 12 meses</div>';
    return;
  }

  // Max rating scale is typically 10.0
  const maxRating = 10.0;
  const maxHeightPx = 130;

  monthlyData.forEach(m => {
    const col = document.createElement('div');
    col.className = 'month-bar-column';

    const hasData = m.averageRating !== null && m.averageRating > 0;
    const heightPercent = hasData ? Math.max(12, Math.min(100, (m.averageRating / maxRating) * 100)) : 4;
    const heightPx = (heightPercent / 100) * maxHeightPx;

    col.innerHTML = `
      <span class="bar-rating-val">${hasData ? m.averageRating.toFixed(1) : ''}</span>
      <div class="bar-fill" style="height: ${heightPx}px; background-color: ${m.color};" title="${m.fullName}: ${hasData ? m.averageRating + ' nota media (' + m.matchesCount + ' partidos)' : 'Sin partidos'}"></div>
      <span class="month-label">${m.name}</span>
    `;

    elements.monthlyBarsChart.appendChild(col);
  });
}

// 9. Render Matches History Table
function renderMatchesHistory(matches) {
  elements.matchesHistoryTableBody.innerHTML = '';
  if (matches.length === 0) {
    elements.matchesHistoryTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay partidos recientes registrados.</td></tr>`;
    return;
  }

  matches.forEach(m => {
    const tr = document.createElement('tr');
    const sofaClass = getRatingClass(m.rating);
    const biwClass = getBiwengerClass(m.biwengerPoints);

    tr.innerHTML = `
      <td>${m.date}</td>
      <td style="color: var(--text-secondary);">${m.tournament}</td>
      <td style="font-weight: 600;">${m.homeTeam} ${m.homeScore !== null ? m.homeScore : ''} - ${m.awayScore !== null ? m.awayScore : ''} ${m.awayTeam}</td>
      <td class="val-center">${m.minutesPlayed}'</td>
      <td class="val-center" style="font-weight: 700; color: ${m.goals > 0 ? 'var(--sofascore-green)' : 'inherit'}">${m.goals}</td>
      <td class="val-center">${m.assists}</td>
      <td class="val-center">${m.yellowCards > 0 ? '🟨 ' + m.yellowCards : ''} ${m.redCards > 0 ? '🟥' : ''}</td>
      <td class="val-center"><span class="score-badge ${sofaClass}">${m.rating !== null ? m.rating.toFixed(1) : '-'}</span></td>
      <td class="val-center"><span class="score-badge ${biwClass}">${m.rating !== null ? m.biwengerPoints : '-'}</span></td>
    `;
    elements.matchesHistoryTableBody.appendChild(tr);
  });
}

function closeModal() {
  elements.playerModal.classList.add('hidden');
  state.activePlayerStats = null;
}

// 10. Live Matches Tracker
async function checkLiveMatches() {
  try {
    const res = await fetch('/api/live');
    const data = await res.json();
    if (data.success && data.matches) {
      state.liveMatches = data.matches;
      elements.liveCountBadge.textContent = state.liveMatches.length;
      renderLiveMatches();
    }
  } catch (e) {
    console.error('Error fetching live matches:', e);
  }
}

function renderLiveMatches() {
  elements.liveMatchesGrid.innerHTML = '';
  if (state.liveMatches.length === 0) {
    elements.liveMatchesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No hay partidos en juego en este momento.</div>`;
    return;
  }

  state.liveMatches.slice(0, 20).forEach(m => {
    const card = document.createElement('div');
    card.className = 'live-card';
    card.innerHTML = `
      <div class="live-card-meta">
        <span class="live-tournament">${m.tournament || 'Fútbol'}</span>
        <span class="live-status-pill">${m.status}</span>
      </div>
      <div class="live-teams-board">
        <div class="live-team-row">
          <span class="live-team-name">${m.homeTeam.name}</span>
          <span class="live-team-score">${m.homeTeam.score}</span>
        </div>
        <div class="live-team-row">
          <span class="live-team-name">${m.awayTeam.name}</span>
          <span class="live-team-score">${m.awayTeam.score}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => loadLiveMatchLineups(m));
    elements.liveMatchesGrid.appendChild(card);
  });
}

async function loadLiveMatchLineups(match) {
  elements.liveMatchDetails.classList.remove('hidden');
  elements.liveMatchTitle.textContent = `${match.homeTeam.name} (${match.homeTeam.score}) vs ${match.awayTeam.name} (${match.awayTeam.score}) - Alineaciones en Vivo`;
  elements.liveLineupsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;">Cargando alineaciones y notas en tiempo real...</div>';

  try {
    const res = await fetch(`/api/live/match/${match.id}`);
    const data = await res.json();
    if (data.success && data.lineups) {
      renderLiveLineups(data.lineups, match);
    } else {
      elements.liveLineupsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">Alineaciones aún no disponibles para este partido.</div>';
    }
  } catch (e) {
    elements.liveLineupsContainer.innerHTML = '<div style="grid-column: 1/-1; color: #ef4444; padding: 20px;">Error al cargar las alineaciones en directo.</div>';
  }
}

function renderLiveLineups(lineups, match) {
  elements.liveLineupsContainer.innerHTML = '';

  const renderTeamCol = (teamData, teamName) => {
    const col = document.createElement('div');
    col.className = 'lineup-team-col';
    col.innerHTML = `<div class="lineup-col-title">${teamName}</div>`;

    const players = teamData?.players || [];
    if (players.length === 0) {
      col.innerHTML += `<div style="color: var(--text-muted); font-size: 0.85rem;">Sin información de alineación</div>`;
      return col;
    }

    players.forEach(p => {
      const stats = p.statistics || {};
      const rating = stats.rating || null;
      const ratingCls = getRatingClass(rating);

      const row = document.createElement('div');
      row.className = 'lineup-player-row';
      row.innerHTML = `
        <div class="lineup-player-info">
          <span class="lineup-shirt">${p.shirtNumber || ''}</span>
          <span class="lineup-name">${p.player?.name}</span>
        </div>
        <div>
          ${rating !== null ? `<span class="score-badge ${ratingCls}">${rating.toFixed(1)}</span>` : `<span class="score-badge score-empty">-</span>`}
        </div>
      `;
      col.appendChild(row);
    });

    return col;
  };

  elements.liveLineupsContainer.appendChild(renderTeamCol(lineups.home, match.homeTeam.name));
  elements.liveLineupsContainer.appendChild(renderTeamCol(lineups.away, match.awayTeam.name));
}

// Window global functions for inline handlers
window.openPlayerModal = openPlayerModal;

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', init);
