class StatsCalculator {
  /**
   * Converts Sofascore rating to Biwenger base points
   */
  ratingToBiwengerBase(rating) {
    if (rating === null || rating === undefined) return 0;
    if (rating < 5.0) return -2;
    if (rating < 6.0) return 0;
    if (rating < 6.5) return 2;
    if (rating < 7.0) return 3;
    if (rating < 7.5) return 4;
    if (rating < 8.0) return 5;
    if (rating < 8.5) return 6;
    if (rating < 9.0) return 7;
    return 8; // 9.0+
  }

  /**
   * Calculates extra Biwenger fantasy points for incidents (goals, assists, cards)
   */
  calculateBiwengerMatchPoints(rating, incidents = {}, position = 'F') {
    let pts = this.ratingToBiwengerBase(rating);
    const goals = incidents.goals || 0;
    const assists = incidents.assists || 0;
    const yellow = incidents.yellowCards || 0;
    const red = (incidents.redCards || 0) + (incidents.yellowRedCards || 0);

    // Goal points by position
    const pos = (position || 'F').toUpperCase();
    let goalPts = 3; // Forward
    if (pos === 'G' || pos === 'POR') goalPts = 6;
    else if (pos === 'D' || pos === 'DEF') goalPts = 5;
    else if (pos === 'M' || pos === 'MED') goalPts = 4;

    pts += goals * goalPts;
    pts += assists * 1;
    pts -= yellow * 1;
    pts -= red * 3;

    return pts;
  }

  /**
   * Aggregate stats for a subset of matches
   */
  aggregateMatches(matches, position = 'F') {
    if (!matches || matches.length === 0) {
      return {
        matchesCount: 0,
        totalMinutes: 0,
        avgMinutes: 0,
        avgRating: null,
        avgBiwengerPoints: null,
        totalGoals: 0,
        avgGoals: 0,
        totalAssists: 0,
        avgAssists: 0,
        totalYellowCards: 0,
        totalRedCards: 0,
        ratings: []
      };
    }

    let totalMinutes = 0;
    let totalGoals = 0;
    let totalAssists = 0;
    let totalYellow = 0;
    let totalRed = 0;
    let ratingSum = 0;
    let ratedMatchesCount = 0;
    let biwengerSum = 0;
    const ratings = [];

    matches.forEach(m => {
      totalMinutes += m.minutesPlayed || 0;
      totalGoals += m.goals || 0;
      totalAssists += m.assists || 0;
      totalYellow += m.yellowCards || 0;
      totalRed += m.redCards || 0;

      if (m.rating !== null && m.rating !== undefined && m.rating > 0) {
        ratingSum += m.rating;
        ratedMatchesCount++;
        ratings.push(m.rating);

        const biwengerPts = this.calculateBiwengerMatchPoints(m.rating, m.incidents, position);
        biwengerSum += biwengerPts;
      }
    });

    const matchesCount = matches.length;
    const avgRating = ratedMatchesCount > 0 ? parseFloat((ratingSum / ratedMatchesCount).toFixed(2)) : null;
    const avgBiwengerPoints = ratedMatchesCount > 0 ? parseFloat((biwengerSum / ratedMatchesCount).toFixed(2)) : null;
    const avgGoals = parseFloat((totalGoals / matchesCount).toFixed(2));
    const avgAssists = parseFloat((totalAssists / matchesCount).toFixed(2));
    const avgMinutes = Math.round(totalMinutes / matchesCount);

    return {
      matchesCount,
      ratedMatchesCount,
      totalMinutes,
      avgMinutes,
      avgRating,
      avgBiwengerPoints,
      totalGoals,
      avgGoals,
      totalAssists,
      avgAssists,
      totalYellowCards: totalYellow,
      totalRedCards: totalRed,
      ratings
    };
  }

  /**
   * Process raw player events into parsed match items
   */
  normalizePlayerMatches(playerEventsData, position = 'F') {
    const { events = [], statisticsMap = {}, incidentsMap = {} } = playerEventsData;
    const normalized = [];

    events.forEach(ev => {
      const eventId = String(ev.id);
      const stat = statisticsMap[eventId] || {};
      const inc = incidentsMap[eventId] || {};

      // Check if player actually took part in the match
      const minutesPlayed = stat.minutesPlayed || 0;
      const rating = stat.rating || null;

      // Only count matches where player played minutes or received a rating
      if (minutesPlayed > 0 || rating !== null) {
        const biwengerPts = rating !== null ? this.calculateBiwengerMatchPoints(rating, inc, position) : 0;

        normalized.push({
          eventId: ev.id,
          startTimestamp: ev.startTimestamp,
          date: new Date(ev.startTimestamp * 1000).toISOString().split('T')[0],
          tournament: ev.tournament?.name || '',
          tournamentSlug: ev.tournament?.slug || '',
          homeTeam: ev.homeTeam?.shortName || ev.homeTeam?.name || '',
          awayTeam: ev.awayTeam?.shortName || ev.awayTeam?.name || '',
          homeScore: ev.homeScore?.current ?? ev.homeScore?.display ?? null,
          awayScore: ev.awayScore?.current ?? ev.awayScore?.display ?? null,
          rating,
          biwengerPoints: biwengerPts,
          minutesPlayed,
          goals: inc.goals || 0,
          assists: inc.assists || 0,
          yellowCards: inc.yellowCards || 0,
          redCards: (inc.redCards || 0) + (inc.yellowRedCards || 0),
          incidents: inc
        });
      }
    });

    // Sort descending by match start timestamp (newest first)
    normalized.sort((a, b) => b.startTimestamp - a.startTimestamp);
    return normalized;
  }

  /**
   * Builds monthly rating summary matching Sofascore's 12-month graph
   */
  buildMonthlyBreakdown(matches) {
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
    const now = new Date();
    const months = [];

    // Create last 12 months array in chronological order (from 11 months ago to current month)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      months.push({
        key,
        name: monthNames[monthIndex],
        fullName: `${monthNames[monthIndex]} ${year}`,
        year,
        matches: [],
        averageRating: null,
        totalGoals: 0,
        matchesCount: 0
      });
    }

    const monthMap = new Map();
    months.forEach(m => monthMap.set(m.key, m));

    matches.forEach(m => {
      const d = new Date(m.startTimestamp * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap.has(key)) {
        const entry = monthMap.get(key);
        entry.matches.push(m);
        entry.totalGoals += m.goals || 0;
      }
    });

    return months.map(m => {
      const rated = m.matches.filter(match => match.rating > 0);
      const avg = rated.length > 0
        ? parseFloat((rated.reduce((sum, match) => sum + match.rating, 0) / rated.length).toFixed(1))
        : null;

      let color = '#475569'; // default slate for empty
      if (avg !== null) {
        if (avg >= 8.0) color = '#00d66c';       // Emerald Sofascore high
        else if (avg >= 7.5) color = '#10b981';  // Green
        else if (avg >= 7.0) color = '#22c55e';  // Light green
        else if (avg >= 6.5) color = '#eab308';  // Yellow
        else if (avg >= 6.0) color = '#f97316';  // Orange
        else color = '#ef4444';                  // Red
      }

      return {
        key: m.key,
        name: m.name,
        fullName: m.fullName,
        year: m.year,
        matchesCount: m.matches.length,
        averageRating: avg,
        totalGoals: m.totalGoals,
        color
      };
    });
  }

  /**
   * Main calculation entry point for a player
   */
  calculatePlayerStats(playerEventsData, position = 'F') {
    const matches = this.normalizePlayerMatches(playerEventsData, position);

    const nowSeconds = Math.floor(Date.now() / 1000);
    // If the latest match is newer than local clock, adjust baseline
    const latestTimestamp = matches.length > 0 ? matches[0].startTimestamp : nowSeconds;
    const baseNow = Math.max(nowSeconds, latestTimestamp);

    const oneMonthSec = 30 * 86400;
    const twoMonthsSec = 60 * 86400;
    const threeMonthsSec = 90 * 86400;
    const sixMonthsSec = 180 * 86400;
    const twelveMonthsSec = 365 * 86400;

    const matches1M = matches.filter(m => m.startTimestamp >= baseNow - oneMonthSec);
    const matches2M = matches.filter(m => m.startTimestamp >= baseNow - twoMonthsSec);
    const matches3M = matches.filter(m => m.startTimestamp >= baseNow - threeMonthsSec);
    const matches6M = matches.filter(m => m.startTimestamp >= baseNow - sixMonthsSec);
    const matches12M = matches.filter(m => m.startTimestamp >= baseNow - twelveMonthsSec);

    const last5Matches = matches.slice(0, 5);
    const last10Matches = matches.slice(0, 10);

    return {
      totalMatchesPlayed: matches.length,
      windows: {
        last1m: this.aggregateMatches(matches1M, position),
        last2m: this.aggregateMatches(matches2M, position),
        last3m: this.aggregateMatches(matches3M, position),
        last6m: this.aggregateMatches(matches6M, position),
        last12m: this.aggregateMatches(matches12M, position),
        last5: this.aggregateMatches(last5Matches, position),
        last10: this.aggregateMatches(last10Matches, position),
        overall: this.aggregateMatches(matches, position)
      },
      monthlyBreakdown: this.buildMonthlyBreakdown(matches),
      recentMatches: matches.slice(0, 25)
    };
  }
}

module.exports = new StatsCalculator();
