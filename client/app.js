// SofaBiwenger Stats & Tactical Scouting App Client Logic
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
  activeView: 'scouting', // 'scouting' | 'stats' | 'live'
  metric: 'sofascore', // 'sofascore' | 'biwenger'
  leagues: DEFAULT_LEAGUES,
  selectedLeagueId: 8, // LaLiga default
  teams: [],
  selectedTeamId: null,
  players: [],
  positionFilter: 'ALL',
  sortBy: 'rating_1m',
  liveMatches: [],
  activePlayerStats: null,

  // Scouting State
  scoutingRole: 'PIVOTE',
  scoutingWindow: '3m', // '3m' | '6m' | '12m'
  scoutingTeamFilter: 'ALL',
  scoutingComplianceFilter: 'ALL',
  scoutingSortBy: 'compliance',
  scoutingData: null,
  rolesConfig: null,
  modalTacticalWindow: 'last3m'
};

// DOM Elements
const elements = {
  // Navigation
  viewScoutingBtn: document.getElementById('viewScoutingBtn'),
  viewStatsBtn: document.getElementById('viewStatsBtn'),
  viewLiveBtn: document.getElementById('viewLiveBtn'),
  scoutingView: document.getElementById('scoutingView'),
  statsView: document.getElementById('statsView'),
  liveView: document.getElementById('liveView'),
  
  // Metric toggle
  toggleSofascore: document.getElementById('toggleSofascore'),
  toggleBiwenger: document.getElementById('toggleBiwenger'),
  currentMetricNames: document.querySelectorAll('.current-metric-name'),

  // Scouting Elements
  scoutingRolesBar: document.getElementById('scoutingRolesBar'),
  scoutingWindowChips: document.getElementById('scoutingWindowChips'),
  scoutingTeamFilter: document.getElementById('scoutingTeamFilter'),
  scoutingComplianceFilter: document.getElementById('scoutingComplianceFilter'),
  scoutingSortSelect: document.getElementById('scoutingSortSelect'),
  criteriaSummaryBanner: document.getElementById('criteriaSummaryBanner'),
  scoutingRoleTitle: document.getElementById('scoutingRoleTitle'),
  scoutingRoleTitleIcon: document.getElementById('scoutingRoleTitleIcon'),
  scoutingTotalBadge: document.getElementById('scoutingTotalBadge'),
  scoutingTableHead: document.getElementById('scoutingTableHead'),
  scoutingTableBody: document.getElementById('scoutingTableBody'),
  scoutingLoadingState: document.getElementById('scoutingLoadingState'),

  // Team View Elements
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

  // Live View Elements
  liveCountBadge: document.getElementById('liveCountBadge'),
  liveMatchesGrid: document.getElementById('liveMatchesGrid'),
  refreshLiveBtn: document.getElementById('refreshLiveBtn'),
  liveMatchDetails: document.getElementById('liveMatchDetails'),
  closeLiveDetailsBtn: document.getElementById('closeLiveDetailsBtn'),
  liveMatchTitle: document.getElementById('liveMatchTitle'),
  liveLineupsContainer: document.getElementById('liveLineupsContainer'),

  // Search Elements
  searchInput: document.getElementById('playerSearchInput'),
  searchSpinner: document.getElementById('searchSpinner'),
  searchResultsDropdown: document.getElementById('searchResultsDropdown'),

  // Modal Elements
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

  // Modal Tactical Elements
  modalTacticalIcon: document.getElementById('modalTacticalIcon'),
  modalTacticalRoleName: document.getElementById('modalTacticalRoleName'),
  modalTacticalComplianceBadge: document.getElementById('modalTacticalComplianceBadge'),
  modalTacticalTabs: document.getElementById('modalTacticalTabs'),
  modalTacticalCriteriaGrid: document.getElementById('modalTacticalCriteriaGrid'),

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
  await loadScoutingRankings();
  checkLiveMatches();
  setInterval(checkLiveMatches, 30000); // Polling live matches every 30s
}

// 2. Bind UI Events
function bindEvents() {
  // Metric toggles
  elements.toggleSofascore.addEventListener('click', () => setMetric('sofascore'));
  elements.toggleBiwenger.addEventListener('click', () => setMetric('biwenger'));

  // Main View switch buttons
  elements.viewScoutingBtn.addEventListener('click', () => switchView('scouting'));
  elements.viewStatsBtn.addEventListener('click', () => switchView('stats'));
  elements.viewLiveBtn.addEventListener('click', () => switchView('live'));

  // Scouting Role Chips
  document.querySelectorAll('#scoutingRolesBar .role-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#scoutingRolesBar .role-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.scoutingRole = chip.dataset.role;
      loadScoutingRankings();
    });
  });

  // Scouting Window Chips
  document.querySelectorAll('#scoutingWindowChips .window-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#scoutingWindowChips .window-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.scoutingWindow = chip.dataset.window;
      loadScoutingRankings();
    });
  });

  // Scouting Filters & Sorting
  elements.scoutingTeamFilter.addEventListener('change', (e) => {
    state.scoutingTeamFilter = e.target.value;
    renderScoutingTable();
  });

  elements.scoutingComplianceFilter.addEventListener('change', (e) => {
    state.scoutingComplianceFilter = e.target.value;
    renderScoutingTable();
  });

  elements.scoutingSortSelect.addEventListener('change', (e) => {
    state.scoutingSortBy = e.target.value;
    renderScoutingTable();
  });

  // Team View Select Change
  elements.teamSelect.addEventListener('change', (e) => {
    state.selectedTeamId = e.target.value;
    loadTeamSquad(state.selectedTeamId);
  });

  // Position Chips in Team View
  elements.posChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.posChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.positionFilter = chip.dataset.pos;
      renderSquadTable();
    });
  });

  // Sort Select in Team View
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

  // Modal Tactical Tabs
  document.querySelectorAll('#modalTacticalTabs .modal-tab-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#modalTacticalTabs .modal-tab-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.modalTacticalWindow = chip.dataset.window;
      updateModalTacticalView();
    });
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
  if (state.activeView === 'scouting') {
    renderScoutingTable();
  } else {
    renderSquadTable();
  }
  if (state.activePlayerStats) {
    updateModalStatsValues();
  }
}

function switchView(view) {
  state.activeView = view;
  elements.viewScoutingBtn.classList.toggle('active', view === 'scouting');
  elements.viewStatsBtn.classList.toggle('active', view === 'stats');
  elements.viewLiveBtn.classList.toggle('active', view === 'live');

  elements.scoutingView.classList.toggle('hidden', view !== 'scouting');
  elements.statsView.classList.toggle('hidden', view !== 'stats');
  elements.liveView.classList.toggle('hidden', view !== 'live');

  if (view === 'scouting') {
    if (!state.scoutingData) {
      loadScoutingRankings();
    } else {
      renderScoutingTable();
    }
  } else if (view === 'stats') {
    if (state.players.length === 0 && state.selectedTeamId) {
      loadTeamSquad(state.selectedTeamId);
    }
  } else if (view === 'live') {
    checkLiveMatches();
  }
}

// ==========================================================================
// 3. TACTICAL SCOUTING SYSTEM (User's Matrix: 3M, 6M, 12M across full league)
// ==========================================================================

async function loadScoutingRankings() {
  elements.scoutingLoadingState.classList.remove('hidden');
  elements.scoutingTableBody.innerHTML = '';

  try {
    const res = await fetch(`/api/scouting/rankings?role=${state.scoutingRole}&window=${state.scoutingWindow}&t=${Date.now()}`);
    const data = await res.json();
    elements.scoutingLoadingState.classList.add('hidden');

    if (data.success && data.role) {
      state.scoutingData = data;
      renderCriteriaBanner(data.role);
      updateScoutingHeader(data.role, data.totalPlayers);
      updateScoutingTeamFilterOptions();
      renderScoutingTable();
    } else {
      elements.scoutingTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">No se pudieron cargar los datos de scouting.</td></tr>`;
    }
  } catch (err) {
    elements.scoutingLoadingState.classList.add('hidden');
    console.error('Scouting load error:', err);
    elements.scoutingTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px; color: #ef4444;">Error al conectar con la API de scouting.</td></tr>`;
  }
}

function updateScoutingHeader(roleDef, totalCount) {
  elements.scoutingRoleTitleIcon.textContent = roleDef.icon || '🎯';
  elements.scoutingRoleTitle.textContent = `Ranking de ${roleDef.name} (${state.scoutingWindow.toUpperCase()})`;
  elements.scoutingTotalBadge.textContent = `${totalCount} jugadores evaluados`;

  // Update sort dropdown options to include role criteria
  elements.scoutingSortSelect.innerHTML = `
    <option value="compliance">Mayor Cumplimiento (Requisitos)</option>
    <option value="rating">Mayor Nota Media</option>
  `;
  roleDef.criteria.forEach(c => {
    const opt = document.createElement('option');
    opt.value = `metric_${c.id}`;
    opt.textContent = `Mayor: ${c.label}`;
    elements.scoutingSortSelect.appendChild(opt);
  });
  elements.scoutingSortSelect.value = state.scoutingSortBy || 'compliance';
}

function updateScoutingTeamFilterOptions() {
  if (state.teams.length > 0 && elements.scoutingTeamFilter.options.length <= 1) {
    elements.scoutingTeamFilter.innerHTML = '<option value="ALL">Todos los equipos de LaLiga</option>';
    state.teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      elements.scoutingTeamFilter.appendChild(opt);
    });
  }
}

function renderCriteriaBanner(roleDef) {
  elements.criteriaSummaryBanner.innerHTML = '';
  if (!roleDef || !roleDef.criteria) return;

  roleDef.criteria.forEach(c => {
    const card = document.createElement('div');
    card.className = 'criteria-card-item';
    card.style.borderLeftColor = roleDef.color || '#00d66c';
    card.innerHTML = `
      <span class="criteria-card-label">${c.label}</span>
      <span class="criteria-card-target" style="color: ${roleDef.color || '#00d66c'};">${c.thresholdDisplay}</span>
      <span class="criteria-card-desc">${c.desc}</span>
    `;
    elements.criteriaSummaryBanner.appendChild(card);
  });
}

function renderScoutingTable() {
  if (!state.scoutingData || !state.scoutingData.role) return;

  const role = state.scoutingData.role;
  const criteria = role.criteria || [];
  let players = [...(state.scoutingData.players || [])];

  // 1. Build Table Headers dynamically according to role criteria
  let headerHtml = `
    <tr>
      <th style="width: 48px; text-align: center;">#</th>
      <th class="th-player">Jugador</th>
      <th>Equipo</th>
      <th class="val-center" title="Partidos jugados en la ventana de tiempo">PJ</th>
  `;

  criteria.forEach(c => {
    headerHtml += `<th class="val-center" title="${c.desc}">${c.label} <small style="color: var(--text-muted); display: block; font-weight: normal;">(${c.thresholdDisplay})</small></th>`;
  });

  headerHtml += `
      <th class="val-center" style="min-width: 140px;">Cumplimiento</th>
      <th class="val-center current-metric-name">${state.metric === 'sofascore' ? 'Nota' : 'Pts Biw'}</th>
      <th class="val-center">Acción</th>
    </tr>
  `;
  elements.scoutingTableHead.innerHTML = headerHtml;

  // 2. Filter by Team
  if (state.scoutingTeamFilter !== 'ALL') {
    players = players.filter(p => String(p.teamId) === String(state.scoutingTeamFilter));
  }

  // 3. Filter by Compliance
  if (state.scoutingComplianceFilter !== 'ALL') {
    players = players.filter(p => p.status === state.scoutingComplianceFilter);
  }

  // 4. Sort
  const sortBy = state.scoutingSortBy;
  players.sort((a, b) => {
    if (sortBy === 'compliance') {
      if (b.passedCount !== a.passedCount) return b.passedCount - a.passedCount;
      return (b.avgRating || 0) - (a.avgRating || 0);
    }
    if (sortBy === 'rating') {
      return (b.avgRating || 0) - (a.avgRating || 0);
    }
    if (sortBy.startsWith('metric_')) {
      const metricId = sortBy.replace('metric_', '');
      const valA = a.metricValues?.[metricId] || 0;
      const valB = b.metricValues?.[metricId] || 0;
      return valB - valA;
    }
    return 0;
  });

  // 5. Render Rows
  elements.scoutingTableBody.innerHTML = '';

  if (players.length === 0) {
    elements.scoutingTableBody.innerHTML = `
      <tr>
        <td colspan="${criteria.length + 6}" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No se encontraron jugadores que coincidan con los filtros de búsqueda seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  const isSofa = state.metric === 'sofascore';

  players.forEach((p, index) => {
    const tr = document.createElement('tr');

    const score = isSofa ? p.avgRating : ((p.avgRating ? p.avgRating * 1.15 : 0));
    const scoreFormatted = score ? score.toFixed(isSofa ? 2 : 1) : '-';
    const scoreCls = isSofa ? getRatingClass(p.avgRating) : getBiwengerClass(score);

    let rowHtml = `
      <td class="val-center" style="font-weight: 700; color: ${index < 3 ? '#00d66c' : 'var(--text-muted)'};">${index + 1}</td>
      <td class="td-player-cell">
        <img class="player-img-table" src="${p.photo}" alt="${p.name}" onerror="this.src='https://api.sofascore.app/static/images/silhouette.png'">
        <div class="player-names">
          <span class="player-fullname">${p.name}</span>
          <span class="player-submeta">${p.jerseyNumber ? '#' + p.jerseyNumber + ' · ' : ''}${p.country || ''}</span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${p.teamLogo ? `<img src="${p.teamLogo}" alt="" style="width: 20px; height: 20px; object-fit: contain;">` : ''}
          <span style="font-weight: 600; font-size: 0.85rem;">${p.teamName || 'Equipo'}</span>
        </div>
      </td>
      <td class="val-center" style="font-weight: 600;">${p.matchesCount}</td>
    `;

    // Render each criterion cell
    criteria.forEach(c => {
      const critObj = p.criteria?.find(item => item.id === c.id) || {};
      const passed = critObj.passed;
      const displayVal = critObj.displayValue || '0';
      const cellCls = passed ? 'metric-val-passed' : 'metric-val-failed';
      const checkIcon = passed ? '✓' : '✗';

      rowHtml += `
        <td class="val-center">
          <span class="metric-val-box ${cellCls}">
            ${displayVal} <span class="metric-check">${checkIcon}</span>
          </span>
        </td>
      `;
    });

    rowHtml += `
      <td class="val-center">
        <span class="${p.badgeClass}">${p.badgeLabel}</span>
      </td>
      <td class="val-center">
        <span class="score-badge ${scoreCls}">${scoreFormatted}</span>
      </td>
      <td class="val-center">
        <button class="action-btn-sm" onclick="event.stopPropagation(); openPlayerModal(${p.id}, '${p.position}')">Ver Ficha</button>
      </td>
    `;

    tr.innerHTML = rowHtml;
    tr.addEventListener('click', () => openPlayerModal(p.id, p.position));
    elements.scoutingTableBody.appendChild(tr);
  });
}

// ==========================================================================
// 4. TEAM VIEW (Squad by Team & Positions)
// ==========================================================================

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

  elements.teamSelect.innerHTML = '<option value="">Cargando equipos...</option>';
  try {
    const res = await fetch(`/api/leagues/${leagueId}/teams`);
    const data = await res.json();
    if (data.success && data.teams && data.teams.length > 0) {
      state.teams = data.teams;
      renderTeamSelect();
      updateScoutingTeamFilterOptions();
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
    const res = await fetch(`/api/teams/${teamId}/stats?t=${Date.now()}`);
    const data = await res.json();
    elements.tableLoadingState.classList.add('hidden');

    if (data.success && data.players) {
      state.players = data.players;
      elements.playersCountBadge.textContent = `${state.players.length} jugadores`;
      renderSquadTable();
    } else {
      elements.squadTableBody.innerHTML = `<tr><td colspan="18" class="py-12 text-center text-slate-400">No se pudieron cargar las estadísticas del equipo.</td></tr>`;
    }
  } catch (e) {
    elements.tableLoadingState.classList.add('hidden');
    elements.squadTableBody.innerHTML = `<tr><td colspan="18" class="py-12 text-center text-red-400">Error de conexión al cargar el equipo.</td></tr>`;
  }
}

function renderSquadTable() {
  elements.squadTableBody.innerHTML = '';

  let filtered = [...state.players];
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
        <button class="action-btn-sm" onclick="event.stopPropagation(); openPlayerModal(${player.id}, '${player.position}')">Ver Ficha</button>
      </td>
    `;

    tr.addEventListener('click', () => openPlayerModal(player.id, player.position));
    elements.squadTableBody.appendChild(tr);
  });
}

// ==========================================================================
// 5. PLAYER MODAL & TACTICAL EVALUATION
// ==========================================================================

async function openPlayerModal(playerId, position = 'F') {
  elements.playerModal.classList.remove('hidden');
  elements.modalLoading.classList.remove('hidden');
  elements.modalContent.classList.add('hidden');

  try {
    const res = await fetch(`/api/players/${playerId}/stats?pos=${position}&t=${Date.now()}`);
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

  // Update tactical evaluation in modal
  updateModalTacticalView();

  // 12M Sofascore Rating Badge (as shown in screenshot)
  const avg12m = w.last12m?.avgRating || stats.windows?.overall?.avgRating || 0;
  elements.sofaAverage12mBadge.textContent = avg12m ? avg12m.toFixed(2) : '-';

  // Render 12 Months Bar Chart
  renderMonthlyBarChart(stats.monthlyBreakdown || []);

  // Render Matches History
  renderMatchesHistory(stats.recentMatches || []);

  elements.modalContent.classList.remove('hidden');
}

function updateModalTacticalView() {
  if (!state.activePlayerStats) return;
  const tactical = state.activePlayerStats.tactical;
  if (!tactical || !tactical.evaluations) return;

  const currentEval = tactical.evaluations[state.modalTacticalWindow] || tactical.evaluations.last3m;
  if (!currentEval) return;

  elements.modalTacticalIcon.textContent = currentEval.roleIcon || '🎯';
  elements.modalTacticalRoleName.textContent = currentEval.roleName;
  elements.modalTacticalComplianceBadge.className = currentEval.badgeClass;
  elements.modalTacticalComplianceBadge.textContent = currentEval.badgeLabel;

  elements.modalTacticalCriteriaGrid.innerHTML = '';
  (currentEval.criteria || []).forEach(c => {
    const item = document.createElement('div');
    item.className = `modal-criteria-item ${c.passed ? 'passed' : ''}`;
    item.innerHTML = `
      <div class="modal-criteria-head">
        <span>${c.label}</span>
        <span>${c.passed ? '✅ Superado' : '❌ No supera'}</span>
      </div>
      <div class="modal-criteria-val" style="color: ${c.passed ? '#00d66c' : '#94a3b8'};">
        ${c.displayValue}
      </div>
      <div class="modal-criteria-target">Meta: <strong>${c.thresholdDisplay}</strong></div>
    `;
    elements.modalTacticalCriteriaGrid.appendChild(item);
  });
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

function renderMonthlyBarChart(monthlyData) {
  elements.monthlyBarsChart.innerHTML = '';

  if (!monthlyData || monthlyData.length === 0) {
    elements.monthlyBarsChart.innerHTML = '<div style="margin: auto; color: var(--text-muted);">Sin datos en los últimos 12 meses</div>';
    return;
  }

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

function renderMatchesHistory(matches) {
  elements.matchesHistoryTableBody.innerHTML = '';

  if (!matches || matches.length === 0) {
    elements.matchesHistoryTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No hay partidos registrados recientemente.</td></tr>';
    return;
  }

  const isSofa = state.metric === 'sofascore';

  matches.forEach(m => {
    const tr = document.createElement('tr');
    const score = isSofa ? m.rating : m.biwengerPoints;
    const scoreFormatted = score !== null ? score.toFixed(isSofa ? 1 : 0) : '-';
    const scoreCls = isSofa ? getRatingClass(m.rating) : getBiwengerClass(m.biwengerPoints);

    const scoreDisplay = `${m.homeScore ?? '-'} - ${m.awayScore ?? '-'}`;

    tr.innerHTML = `
      <td>${m.date || '-'}</td>
      <td><span style="color: var(--text-secondary); font-size: 0.8rem;">${m.tournament || 'Competición'}</span></td>
      <td><strong>${m.homeTeam}</strong> vs <strong>${m.awayTeam}</strong></td>
      <td class="val-center"><span style="font-weight: 700;">${scoreDisplay}</span></td>
      <td class="val-center">${m.minutesPlayed}'</td>
      <td class="val-center">${m.goals > 0 ? `<span style="color: #00d66c; font-weight: 700;">${m.goals}</span>` : '0'} / ${m.assists > 0 ? `<span style="color: #38bdf8; font-weight: 700;">${m.assists}</span>` : '0'}</td>
      <td class="val-center"><span class="score-badge ${scoreCls}">${scoreFormatted}</span></td>
    `;
    elements.matchesHistoryTableBody.appendChild(tr);
  });
}

function closeModal() {
  elements.playerModal.classList.add('hidden');
  state.activePlayerStats = null;
}

// ==========================================================================
// 6. SEARCH & LIVE TRACKING
// ==========================================================================

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

function renderSearchResults(results) {
  elements.searchResultsDropdown.innerHTML = '';
  if (results.length === 0) {
    elements.searchResultsDropdown.innerHTML = '<div class="search-result-item" style="color: var(--text-muted);">No se encontraron jugadores</div>';
    elements.searchResultsDropdown.classList.remove('hidden');
    return;
  }

  results.forEach(p => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <img src="${p.photo}" alt="${p.name}" class="search-item-photo" onerror="this.src='https://api.sofascore.app/static/images/silhouette.png'">
      <div class="search-item-info">
        <span class="search-item-name">${p.name}</span>
        <span class="search-item-meta">${p.team?.name || ''} · ${getPositionName(p.position)}</span>
      </div>
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

async function checkLiveMatches() {
  try {
    const res = await fetch('/api/live');
    const data = await res.json();
    if (data.success && data.liveMatches) {
      state.liveMatches = data.liveMatches;
      elements.liveCountBadge.textContent = state.liveMatches.length;
      if (state.activeView === 'live') {
        renderLiveMatchesGrid();
      }
    }
  } catch (e) {
    console.error('Live polling error:', e);
  }
}

function renderLiveMatchesGrid() {
  elements.liveMatchesGrid.innerHTML = '';

  if (state.liveMatches.length === 0) {
    elements.liveMatchesGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">No hay partidos en juego en este momento.</p>
        <span style="font-size: 0.85rem;">Las notas de Sofascore se actualizarán en vivo automáticamente cuando comiencen los partidos.</span>
      </div>
    `;
    return;
  }

  state.liveMatches.forEach(m => {
    const card = document.createElement('div');
    card.className = 'live-match-card';
    card.innerHTML = `
      <div class="live-match-header">
        <span class="tournament-tag">${m.tournament || 'Fútbol'}</span>
        <span class="live-minute"><span class="live-pulse"></span> ${m.minute || 'En juego'}</span>
      </div>
      <div class="live-match-teams">
        <div class="live-team-row">
          <span class="live-team-name">${m.homeTeam.name}</span>
          <span class="live-score-val">${m.homeTeam.score}</span>
        </div>
        <div class="live-team-row">
          <span class="live-team-name">${m.awayTeam.name}</span>
          <span class="live-score-val">${m.awayTeam.score}</span>
        </div>
      </div>
      <div class="live-card-footer">
        <span>Click para ver alineaciones y notas en vivo</span>
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
