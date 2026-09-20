const fs = require('fs');
const path = require('path');
const sofascore = require('../services/sofascoreService');
const statsCalculator = require('../services/statsCalculator');

const dataDir = path.join(__dirname, '..', 'data');
const squads = require(path.join(dataDir, 'laliga_squads.json'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processTeam(teamId) {
  const targetFile = path.join(dataDir, `team_stats_${teamId}.json`);
  if (teamId === '2829') {
    console.log(`Team ${teamId} is Real Madrid, skipping.`);
    return;
  }
  if (fs.existsSync(targetFile)) {
    console.log(`Team ${teamId} already exists, skipping.`);
    return;
  }

  const players = squads[teamId];
  if (!players || players.length === 0) {
    console.log(`No players found for team ${teamId}`);
    return;
  }

  console.log(`\nProcessing team ${teamId} with ${players.length} players...`);
  const enriched = [];
  const chunkSize = 6;

  for (let i = 0; i < players.length; i += chunkSize) {
    const chunk = players.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(async (player) => {
      try {
        const eventsData = await sofascore.getPlayerEvents(player.id, 2);
        const stats = statsCalculator.calculatePlayerStats(eventsData, player.position);
        return { ...player, stats };
      } catch (err) {
        console.warn(`Error fetching stats for ${player.name} (${player.id}):`, err.message);
        const emptyStats = statsCalculator.calculatePlayerStats({ events: [], statistics: {}, incidents: {} }, player.position);
        return { ...player, stats: emptyStats };
      }
    }));
    enriched.push(...results);
    await sleep(300);
  }

  fs.writeFileSync(targetFile, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`Saved team ${teamId} stats to ${targetFile} (${enriched.length} players)`);
}

async function run() {
  const teamIds = Object.keys(squads);
  console.log(`Starting pre-calculation for ${teamIds.length} teams...`);
  for (const teamId of teamIds) {
    await processTeam(teamId);
  }
  console.log('All teams completed successfully!');
}

run().catch(console.error);
