const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const sofascore = require('./services/sofascoreService');
const calculator = require('./services/statsCalculator');
const cache = require('./services/cacheService');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files (used for local server)
app.use(express.static(path.join(__dirname, '..', 'client')));

// 1. Get Leagues
app.get('/api/leagues', (req, res) => {
  try {
    const data = require('./data/leagues.json');
    res.json({ success: true, leagues: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get League Teams / Standings
app.get('/api/leagues/:leagueId/teams', async (req, res) => {
  try {
    const { leagueId } = req.params;
    let teams = await sofascore.getLeagueStandings(leagueId);
    if (!teams || teams.length === 0) {
      if (String(leagueId) === '8') {
        try { teams = require('./data/laliga_teams.json'); } catch(e) {}
      }
    }
    res.json({ success: true, teams: teams || [] });
  } catch (err) {
    if (String(req.params.leagueId) === '8') {
      try {
        const teams = require('./data/laliga_teams.json');
        return res.json({ success: true, teams });
      } catch (e) {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Players in a Team
app.get('/api/teams/:teamId/players', async (req, res) => {
  try {
    const { teamId } = req.params;
    let players = await sofascore.getTeamPlayers(teamId);
    if (!players || players.length === 0) {
      try {
        const squads = require('./data/laliga_squads.json');
        if (squads && squads[teamId]) {
          players = squads[teamId];
        }
      } catch (e) {}
    }
    res.json({ success: true, players: players || [] });
  } catch (err) {
    try {
      const squads = require('./data/laliga_squads.json');
      if (squads && squads[req.params.teamId]) {
        return res.json({ success: true, players: squads[req.params.teamId] });
      }
    } catch (e) {}
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Search Players
app.get('/api/players/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (query.trim().length < 2) {
      return res.json({ success: true, results: [] });
    }
    const data = await sofascore.search(query);
    const players = (data.results || [])
      .filter(r => r.type === 'player')
      .map(r => ({
        id: r.entity.id,
        name: r.entity.name,
        slug: r.entity.slug,
        shortName: r.entity.shortName || r.entity.name,
        position: r.entity.position || 'M',
        jerseyNumber: r.entity.jerseyNumber || '',
        team: r.entity.team ? {
          id: r.entity.team.id,
          name: r.entity.team.name,
          slug: r.entity.team.slug
        } : null,
        photo: `https://api.sofascore.app/api/v1/player/${r.entity.id}/image`,
        sofascoreId: r.entity.sofascoreId || ''
      }));

    res.json({ success: true, results: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Explicit map of all 20 LaLiga teams so esbuild statically bundles them into Netlify functions
const TEAM_STATS_MAP = {
  '2814': () => require('./data/team_stats_2814.json'),
  '2816': () => require('./data/team_stats_2816.json'),
  '2817': () => require('./data/team_stats_2817.json'),
  '2818': () => require('./data/team_stats_2818.json'),
  '2819': () => require('./data/team_stats_2819.json'),
  '2820': () => require('./data/team_stats_2820.json'),
  '2821': () => require('./data/team_stats_2821.json'),
  '2824': () => require('./data/team_stats_2824.json'),
  '2825': () => require('./data/team_stats_2825.json'),
  '2828': () => require('./data/team_stats_2828.json'),
  '2829': () => require('./data/real_madrid_stats.json'),
  '2830': () => require('./data/team_stats_2830.json'),
  '2832': () => require('./data/team_stats_2832.json'),
  '2833': () => require('./data/team_stats_2833.json'),
  '2835': () => require('./data/team_stats_2835.json'),
  '2836': () => require('./data/team_stats_2836.json'),
  '2846': () => require('./data/team_stats_2846.json'),
  '2849': () => require('./data/team_stats_2849.json'),
  '2859': () => require('./data/team_stats_2859.json'),
  '2885': () => require('./data/team_stats_2885.json'),
};

// Helper to find player stats across all precomputed files
function findPlayerFallback(playerId) {
  const pIdStr = String(playerId);
  if (pIdStr === '826643') {
    try {
      const mbappe = require('./data/player_826643.json');
      return {
        ...mbappe,
        tactical: calculator.buildPlayerTacticalProfiles(mbappe.player || { position: 'F', stats: mbappe.stats })
      };
    } catch (e) {}
  }

  for (const teamLoader of Object.values(TEAM_STATS_MAP)) {
    try {
      const squad = teamLoader();
      const found = squad.find(p => String(p.id) === pIdStr);
      if (found && found.stats && found.stats.totalMatchesPlayed > 0) {
        return {
          success: true,
          player: {
            id: found.id,
            name: found.name,
            position: found.position,
            jerseyNumber: found.jerseyNumber,
            country: { name: found.country },
            sofascoreId: found.sofascoreId,
            team: { name: found.teamName || 'Equipo' }
          },
          stats: found.stats,
          tactical: found.tactical || calculator.buildPlayerTacticalProfiles(found)
        };
      }
    } catch (e) {}
  }

  return null;
}

// 5. Get Individual Player Full Stats (1M, 2M, 3M, 6M, 12M, monthly graph, match history)
app.get('/api/players/:playerId/stats', async (req, res) => {
  const { playerId } = req.params;
  const position = req.query.pos || 'F';

  try {
    // Fetch player info if needed
    const playerDetails = await sofascore.getPlayerDetails(playerId);

    // Fetch events history
    const eventsData = await sofascore.getPlayerEvents(playerId, 2);

    if (eventsData && eventsData.events && eventsData.events.length > 0) {
      const stats = calculator.calculatePlayerStats(eventsData, position);
      const tactical = calculator.buildPlayerTacticalProfiles({ position, stats });
      return res.json({
        success: true,
        player: playerDetails,
        stats,
        tactical
      });
    }

    const fallback = findPlayerFallback(playerId);
    if (fallback) return res.json(fallback);

    const emptyStats = calculator.calculatePlayerStats({ events: [], statistics: {}, incidents: {} }, position);
    res.json({
      success: true,
      player: playerDetails,
      stats: emptyStats,
      tactical: calculator.buildPlayerTacticalProfiles({ position, stats: emptyStats })
    });
  } catch (err) {
    const fallback = findPlayerFallback(playerId);
    if (fallback) return res.json(fallback);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.1 Scouting: Get Tactical Roles & Criteria
app.get('/api/scouting/roles', (req, res) => {
  try {
    res.json({ success: true, roles: calculator.getRolesDefinitions() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.2 Scouting: Get League-Wide Ranking by Tactical Role (3M, 6M, 12M)
app.get('/api/scouting/rankings', (req, res) => {
  try {
    const rawRole = (req.query.role || 'MEDIOCAMPO').toUpperCase();
    const roleId = calculator.normalizeRole ? calculator.normalizeRole(rawRole) : rawRole;
    const windowKey = req.query.window === '6m' ? 'last6m' : req.query.window === '12m' ? 'last12m' : 'last3m';
    const minMatches = parseInt(req.query.minMatches || '1', 10);

    const roles = calculator.getRolesDefinitions();
    const roleDef = roles[roleId] || roles.MEDIOCAMPO;

    // Map teams info
    let laligaTeams = [];
    try {
      laligaTeams = require('./data/laliga_teams.json');
    } catch (e) {}
    const teamsMap = new Map();
    laligaTeams.forEach(t => teamsMap.set(String(t.id), t));

    const allEvaluated = [];

    for (const [teamId, loader] of Object.entries(TEAM_STATS_MAP)) {
      try {
        const players = loader();
        const teamInfo = teamsMap.get(String(teamId)) || { name: 'Equipo', logo: '' };

        players.forEach(p => {
          const pos = (p.position || 'M').toUpperCase();
          const applies = roleDef.applicablePositions.includes(pos);
          if (!applies) return;

          const evalResult = calculator.evaluatePlayerTactical(p, windowKey, roleId);
          if (evalResult.matchesCount < minMatches) return;

          allEvaluated.push({
            id: p.id,
            name: p.name,
            shortName: p.shortName || p.name,
            photo: p.photo || `https://api.sofascore.app/api/v1/player/${p.id}/image`,
            position: p.position,
            jerseyNumber: p.jerseyNumber,
            country: p.country,
            teamId,
            teamName: teamInfo.name,
            teamLogo: teamInfo.logo,
            matchesCount: evalResult.matchesCount,
            avgRating: evalResult.avgRating,
            passedCount: evalResult.passedCount,
            totalCount: evalResult.totalCount,
            compliancePct: evalResult.compliancePct,
            status: evalResult.status,
            badgeClass: evalResult.badgeClass,
            badgeLabel: evalResult.badgeLabel,
            criteria: evalResult.criteria,
            metricValues: evalResult.criteria.reduce((acc, c) => {
              acc[c.id] = c.value;
              return acc;
            }, {})
          });
        });
      } catch (e) {}
    }

    // Sort: 1) passedCount desc, 2) avgRating desc
    allEvaluated.sort((a, b) => {
      if (b.passedCount !== a.passedCount) {
        return b.passedCount - a.passedCount;
      }
      return (b.avgRating || 0) - (a.avgRating || 0);
    });

    res.json({
      success: true,
      role: roleDef,
      window: windowKey,
      totalPlayers: allEvaluated.length,
      players: allEvaluated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Team Squad with Aggregated Stats (1M, 2M, 3M, 6M, 12M for all players in team)
app.get('/api/teams/:teamId/stats', async (req, res) => {
  const { teamId } = req.params;

  // 1. Direct match for pre-calculated team files (bundled via TEAM_STATS_MAP)
  if (TEAM_STATS_MAP[teamId]) {
    try {
      let teamData = TEAM_STATS_MAP[teamId]();
      if (teamData && teamData.length > 0) {
        teamData = teamData.map(p => ({
          ...p,
          tactical: p.tactical || calculator.buildPlayerTacticalProfiles(p)
        }));
        return res.json({ success: true, players: teamData });
      }
    } catch (e) {}
  }

  try {
    const cacheKey = `team_stats_${teamId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, players: cached });
    }

    let players = await sofascore.getTeamPlayers(teamId);
    if (!players || players.length === 0) {
      try {
        const squads = require('./data/laliga_squads.json');
        if (squads && squads[teamId]) {
          players = squads[teamId];
        }
      } catch (e) {}
    }

    if (!players || players.length === 0) {
      return res.json({ success: true, players: [] });
    }

    // Process top squad players with concurrency limit of 5
    const enrichedPlayers = [];
    const limit = 5;

    for (let i = 0; i < players.length; i += limit) {
      const batch = players.slice(i, i + limit);
      const batchPromises = batch.map(async (p) => {
        try {
          const eventsData = await sofascore.getPlayerEvents(p.id, 2);
          const stats = calculator.calculatePlayerStats(eventsData, p.position);
          return {
            ...p,
            stats
          };
        } catch (e) {
          return {
            ...p,
            stats: calculator.calculatePlayerStats({ events: [], statistics: {}, incidents: {} }, p.position)
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      enrichedPlayers.push(...batchResults);
    }

    cache.set(cacheKey, enrichedPlayers, 1800); // 30 minutes cache for full squad stats
    res.json({ success: true, players: enrichedPlayers });
  } catch (err) {
    if (TEAM_STATS_MAP[teamId]) {
      try {
        return res.json({ success: true, players: TEAM_STATS_MAP[teamId]() });
      } catch (e) {}
    }
    try {
      const squads = require('./data/laliga_squads.json');
      if (squads && squads[teamId]) {
        const fallbackPlayers = squads[teamId].map(p => ({
          ...p,
          stats: calculator.calculatePlayerStats({ events: [], statistics: {}, incidents: {} }, p.position)
        }));
        return res.json({ success: true, players: fallbackPlayers });
      }
    } catch(e) {}
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get Live Matches
app.get('/api/live', async (req, res) => {
  try {
    const liveMatches = await sofascore.getLiveEvents();
    res.json({ success: true, count: liveMatches.length, matches: liveMatches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Get Live Match Lineups & Ratings
app.get('/api/live/match/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const lineups = await sofascore.getEventLineups(eventId);
    res.json({ success: true, lineups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Server-Sent Events (SSE) for Real-Time Live Updates
app.get('/api/live/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = async () => {
    try {
      const liveMatches = await sofascore.getLiveEvents();
      res.write(`data: ${JSON.stringify({ matches: liveMatches, timestamp: Date.now() })}\n\n`);
    } catch (e) {
      // ignore
    }
  };

  sendUpdate();
  const intervalId = setInterval(sendUpdate, 25000); // every 25s

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

module.exports = app;
