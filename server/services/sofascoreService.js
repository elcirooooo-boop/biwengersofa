const { execSync } = require('child_process');
const cache = require('./cacheService');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0'
];

class SofascoreService {
  constructor() {
    this.baseUrl = 'https://api.sofascore.com/api/v1';
  }

  _getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async fetchWithFallback(url) {
    const ua = this._getRandomUserAgent();

    // 1. Try native fetch first
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.sofascore.com/',
          'Origin': 'https://www.sofascore.com',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      // Fall through to curl fallback
    }

    // 2. Fallback to curl if fetch fails or hits 403
    try {
      const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const escapedUrl = url.replace(/"/g, '\\"');
      const cmd = `${curlBin} -s --max-time 8 -H "User-Agent: ${ua}" -H "Accept: application/json, text/plain, */*" -H "Referer: https://www.sofascore.com/" -H "Origin: https://www.sofascore.com" -H "Accept-Language: es-ES,es;q=0.9,en;q=0.8" "${escapedUrl}"`;
      const stdout = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      if (stdout && stdout.trim().startsWith('{') || stdout.trim().startsWith('[')) {
        return JSON.parse(stdout);
      }
    } catch (err) {
      console.warn(`Curl fallback failed for ${url}:`, err.message);
    }

    return null;
  }

  async search(query) {
    if (!query || query.trim().length < 2) return { results: [] };
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/search/all?q=${encodeURIComponent(query.trim())}`;
    const data = await this.fetchWithFallback(url);
    if (data) {
      cache.set(cacheKey, data, 3600); // 1 hour
      return data;
    }
    return { results: [] };
  }

  async getLeagueSeasons(uniqueTournamentId) {
    const cacheKey = `tournament_${uniqueTournamentId}_seasons`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/unique-tournament/${uniqueTournamentId}/seasons`;
    const data = await this.fetchWithFallback(url);
    if (data && data.seasons) {
      cache.set(cacheKey, data.seasons, 86400); // 24 hours
      return data.seasons;
    }
    return [];
  }

  async getLeagueStandings(uniqueTournamentId, seasonId = null) {
    if (!seasonId) {
      const seasons = await this.getLeagueSeasons(uniqueTournamentId);
      if (seasons && seasons.length > 0) {
        seasonId = seasons[0].id;
      }
    }
    if (!seasonId) return [];

    const cacheKey = `standings_${uniqueTournamentId}_${seasonId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/standings/total`;
    const data = await this.fetchWithFallback(url);
    if (data && data.standings && data.standings.length > 0) {
      const rows = data.standings[0].rows || [];
      const teams = rows.map(r => ({
        id: r.team.id,
        name: r.team.name,
        slug: r.team.slug,
        shortName: r.team.shortName || r.team.name,
        position: r.position,
        matches: r.matches,
        points: r.points,
        logo: `https://api.sofascore.app/api/v1/team/${r.team.id}/image`
      }));
      cache.set(cacheKey, teams, 3600 * 4); // 4 hours
      return teams;
    }
    return [];
  }

  async getTeamPlayers(teamId) {
    const cacheKey = `team_${teamId}_players`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/team/${teamId}/players`;
    const data = await this.fetchWithFallback(url);
    if (data && data.players) {
      const players = data.players.map(item => {
        const p = item.player;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          shortName: p.shortName || p.name,
          position: p.position || 'M',
          jerseyNumber: p.jerseyNumber || '',
          country: p.country?.name || '',
          countryCode: p.country?.alpha2?.toLowerCase() || '',
          sofascoreId: p.sofascoreId || '',
          photo: `https://api.sofascore.app/api/v1/player/${p.id}/image`
        };
      });
      cache.set(cacheKey, players, 3600 * 12); // 12 hours
      return players;
    }
    return [];
  }

  async getPlayerDetails(playerId) {
    const cacheKey = `player_${playerId}_details`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/player/${playerId}`;
    const data = await this.fetchWithFallback(url);
    if (data && data.player) {
      cache.set(cacheKey, data.player, 3600 * 12);
      return data.player;
    }
    return null;
  }

  async getPlayerEvents(playerId, maxPages = 2) {
    // 2 pages usually gives ~60 matches, which spans > 12 months for most active players
    const cacheKey = `player_${playerId}_events`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    let allEvents = [];
    let statisticsMap = {};
    let incidentsMap = {};

    for (let page = 0; page < maxPages; page++) {
      const url = `${this.baseUrl}/player/${playerId}/events/last/${page}`;
      const data = await this.fetchWithFallback(url);
      if (!data || !data.events || data.events.length === 0) break;

      allEvents = allEvents.concat(data.events);
      if (data.statisticsMap) {
        statisticsMap = { ...statisticsMap, ...data.statisticsMap };
      }
      if (data.incidentsMap) {
        incidentsMap = { ...incidentsMap, ...data.incidentsMap };
      }

      if (!data.hasNextPage) break;
    }

    const result = {
      events: allEvents,
      statisticsMap,
      incidentsMap
    };

    cache.set(cacheKey, result, 600); // 10 minutes cache
    return result;
  }

  async getLiveEvents() {
    const url = `${this.baseUrl}/sport/football/events/live`;
    const data = await this.fetchWithFallback(url);
    if (data && data.events) {
      return data.events.map(ev => ({
        id: ev.id,
        slug: ev.slug,
        tournament: ev.tournament?.name,
        category: ev.tournament?.category?.name,
        homeTeam: {
          id: ev.homeTeam?.id,
          name: ev.homeTeam?.name,
          shortName: ev.homeTeam?.shortName,
          score: ev.homeScore?.current ?? 0
        },
        awayTeam: {
          id: ev.awayTeam?.id,
          name: ev.awayTeam?.name,
          shortName: ev.awayTeam?.shortName,
          score: ev.awayScore?.current ?? 0
        },
        status: ev.status?.description || 'En juego',
        statusCode: ev.status?.code,
        startTimestamp: ev.startTimestamp
      }));
    }
    return [];
  }

  async getEventLineups(eventId) {
    const cacheKey = `lineup_${eventId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/event/${eventId}/lineups`;
    const data = await this.fetchWithFallback(url);
    if (data) {
      // Short cache for live matches (30 seconds)
      cache.set(cacheKey, data, 30);
      return data;
    }
    return null;
  }
}

module.exports = new SofascoreService();
