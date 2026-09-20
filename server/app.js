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
    const leaguesPath = path.join(__dirname, 'data', 'leagues.json');
    const data = JSON.parse(fs.readFileSync(leaguesPath, 'utf8'));
    res.json({ success: true, leagues: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get League Teams / Standings
app.get('/api/leagues/:leagueId/teams', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const teams = await sofascore.getLeagueStandings(leagueId);
    res.json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Players in a Team
app.get('/api/teams/:teamId/players', async (req, res) => {
  try {
    const { teamId } = req.params;
    const players = await sofascore.getTeamPlayers(teamId);
    res.json({ success: true, players });
  } catch (err) {
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

// 5. Get Individual Player Full Stats (1M, 2M, 3M, 6M, 12M, monthly graph, match history)
app.get('/api/players/:playerId/stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const position = req.query.pos || 'F';

    // Fetch player info if needed
    const playerDetails = await sofascore.getPlayerDetails(playerId);

    // Fetch events history
    const eventsData = await sofascore.getPlayerEvents(playerId, 2);

    // Compute metrics (includes 1M, 2M, 3M, 6M, 12M)
    const stats = calculator.calculatePlayerStats(eventsData, position);

    res.json({
      success: true,
      player: playerDetails,
      stats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Team Squad with Aggregated Stats (1M, 2M, 3M, 6M, 12M for all players in team)
app.get('/api/teams/:teamId/stats', async (req, res) => {
  try {
    const { teamId } = req.params;
    const cacheKey = `team_stats_${teamId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, players: cached });
    }

    const players = await sofascore.getTeamPlayers(teamId);
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
            stats: null
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      enrichedPlayers.push(...batchResults);
    }

    cache.set(cacheKey, enrichedPlayers, 1800); // 30 minutes cache for full squad stats
    res.json({ success: true, players: enrichedPlayers });
  } catch (err) {
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
