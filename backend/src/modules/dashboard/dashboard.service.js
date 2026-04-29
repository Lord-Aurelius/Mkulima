const { query } = require("../../config/db");

async function getSummary(auth, farmId) {
  const scopedFarmId = auth.role === "creator" ? farmId : auth.farmId;
  const params = scopedFarmId ? [scopedFarmId] : [];
  const farmCondition = scopedFarmId ? "WHERE farm_id = $1" : "";

  const [crops, livestock, workers, activity, yields] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM crops ${farmCondition}`, params),
    query(`SELECT COUNT(*)::int AS total FROM livestock ${farmCondition}`, params),
    query(`SELECT COUNT(*)::int AS total FROM users ${farmCondition ? `${farmCondition} AND role = 'worker'` : "WHERE role = 'worker'"}`, params),
    query(
      `
        SELECT l.id, l.task, l.created_at, u.name AS worker_name
        FROM daily_logs l
        INNER JOIN users u ON u.id = l.worker_id
        ${scopedFarmId ? "WHERE l.farm_id = $1" : ""}
        ORDER BY l.created_at DESC
        LIMIT 8
      `,
      params
    ),
    query(`SELECT COALESCE(SUM(expected_yield), 0) AS total FROM crops ${farmCondition}`, params)
  ]);

  return {
    totalCrops: crops.rows[0].total,
    totalLivestock: livestock.rows[0].total,
    totalWorkers: workers.rows[0].total,
    expectedYield: Number(yields.rows[0].total || 0),
    recentActivity: activity.rows,
    metrics: {
      cropCount: crops.rows[0].total,
      livestockCount: livestock.rows[0].total,
      workerCount: workers.rows[0].total,
      expectedYieldTotal: Number(yields.rows[0].total || 0)
    }
  };
}

module.exports = {
  getSummary
};
