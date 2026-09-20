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

// Helper to find player stats across all precomputed files
function findPlayerFallback(playerId) {
  const pIdStr = String(playerId);
  if (pIdStr === '826643') {
    try {
      return require('./data/player_826643.json');
    } catch (e) {}
  }

  // 1. Check Real Madrid
  try {
    const rma = require('./data/real_madrid_stats.json');
    const f = rma.find(p => String(p.id) === pIdStr);
    if (f && f.stats) {
      return {
        success: true,
        player: {
          id: f.id,
          name: f.name,
          position: f.position,
          jerseyNumber: f.jerseyNumber,
          country: { name: f.country },
          sofascoreId: f.sofascoreId,
          team: { name: 'Real Madrid' }
        },
        stats: f.stats
      };
    }
  } catch (e) {}

  // 2. Check all team_stats_*.json files
  try {
    const dataDir = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('team_stats_') && f.endsWith('.json'));
    for (const file of files) {
      try {
        const teamData = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
        const f = teamData.find(p => String(p.id) === pIdStr);
        if (f && f.stats) {
          return {
            success: true,
            player: {
              id: f.id,
              name: f.name,
              position: f.position,
              jerseyNumber: f.jerseyNumber,
              country: { name: f.country },
              sofascoreId: f.sofascoreId,
              team: { name: f.teamName || 'Equipo' }
            },
            stats: f.stats
          };
        }
      } catch (e) {}
    }
  } catch (e) {}

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
      return res.json({
        success: true,
        player: playerDetails,
        stats
      });
    }

    const fallback = findPlayerFallback(playerId);
    if (fallback) return res.json(fallback);

    res.json({
      success: true,
      player: playerDetails,
      stats: calculator.calculatePlayerStats({ events: [], statistics: {}, incidents: {} }, position)
    });
  } catch (err) {
    const fallback = findPlayerFallback(playerId);
    if (fallback) return res.json(fallback);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Team Squad with Aggregated Stats (1M, 2M, 3M, 6M, 12M for all players in team)
app.get('/api/teams/:teamId/stats', async (req, res) => {
  const { teamId } = req.params;

  try {
    // 1. Direct match for pre-calculated team files
    if (String(teamId) === '2829') {
      try {
        const rma = require('./data/real_madrid_stats.json');
        return res.json({ success: true, players: rma });
      } catch (e) {}
    }
    const teamFile = path.join(__dirname, 'data', `team_stats_${teamId}.json`);
    if (fs.existsSync(teamFile)) {
      try {
        const teamData = JSON.parse(fs.readFileSync(teamFile, 'utf8'));
        if (teamData && teamData.length > 0) {
          return res.json({ success: true, players: teamData });
        }
      } catch (e) {}
    }

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
    if (String(teamId) === '2829') {
      try {
        return res.json({ success: true, players: require('./data/real_madrid_stats.json') });
      } catch (e) {}
    }
    const teamFile = path.join(__dirname, 'data', `team_stats_${teamId}.json`);
    if (fs.existsSync(teamFile)) {
      try {
        return res.json({ success: true, players: JSON.parse(fs.readFileSync(teamFile, 'utf8')) });
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
