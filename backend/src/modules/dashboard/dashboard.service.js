const { query } = require("../../config/db");
const AppError = require("../../lib/app-error");

function resolveScopedFarmId(auth, farmId, { requireForCreator = false } = {}) {
  if (auth.role === "creator") {
    if (requireForCreator && !farmId) {
      throw new AppError(422, "Farm ID is required.");
    }
    return farmId || null;
  }

  return auth.farmId;
}

async function getSummary(auth, farmId) {
  if (auth.role === "worker") {
    return getWorkerContribution(auth, {});
  }

  const scopedFarmId = resolveScopedFarmId(auth, farmId);
  const params = scopedFarmId ? [scopedFarmId] : [];
  const farmCondition = scopedFarmId ? "WHERE farm_id = $1" : "";
  const financeCondition = scopedFarmId ? "WHERE farm_id = $1" : "WHERE 1 = 0";

  const [crops, livestock, workers, activity, yields, finances] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM crops ${farmCondition}`, params),
    query(`SELECT COUNT(*)::int AS total FROM livestock ${farmCondition}`, params),
    query(`SELECT COUNT(*)::int AS total FROM users ${farmCondition ? `${farmCondition} AND role = 'worker'` : "WHERE role = 'worker'"}`, params),
    query(
      `
        SELECT l.id, l.task, l.created_at, l.target_label, u.name AS worker_name
        FROM daily_logs l
        INNER JOIN users u ON u.id = l.worker_id
        ${scopedFarmId ? "WHERE l.farm_id = $1" : ""}
        ORDER BY l.created_at DESC
        LIMIT 8
      `,
      params
    ),
    query(`SELECT COALESCE(SUM(expected_yield), 0) AS total FROM crops ${farmCondition}`, params),
    query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) AS expense
        FROM finance_entries
        ${financeCondition}
      `,
      params
    )
  ]);

  const income = Number(finances.rows[0]?.income || 0);
  const expense = Number(finances.rows[0]?.expense || 0);

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
      expectedYieldTotal: Number(yields.rows[0].total || 0),
      totalIncome: income,
      totalExpense: expense,
      netFarmResult: income - expense
    }
  };
}

async function getMonthlyReport(auth, { farmId, month }) {
  const scopedFarmId = resolveScopedFarmId(auth, farmId, { requireForCreator: true });
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  const monthDate = `${reportMonth}-01`;

  const [overview, harvests, inputs, production, finance, logs] = await Promise.all([
    query(
      `
        SELECT
          COUNT(*)::int AS log_count,
          COUNT(DISTINCT worker_id)::int AS active_workers
        FROM daily_logs
        WHERE farm_id = $1
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
      `,
      [scopedFarmId, monthDate]
    ),
    query(
      `
        SELECT target_label, COALESCE(SUM(quantity), 0) AS total_quantity, unit
        FROM farm_activity_records
        WHERE farm_id = $1
          AND record_type = 'harvest'
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
        GROUP BY target_label, unit
        ORDER BY target_label ASC
      `,
      [scopedFarmId, monthDate]
    ),
    query(
      `
        SELECT material_type, COALESCE(SUM(quantity), 0) AS total_quantity, unit
        FROM farm_activity_records
        WHERE farm_id = $1
          AND record_type = 'input'
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
        GROUP BY material_type, unit
        ORDER BY material_type ASC
      `,
      [scopedFarmId, monthDate]
    ),
    query(
      `
        SELECT l.type AS livestock_type, COALESCE(SUM(lu.metric_value), 0) AS total_metric
        FROM livestock_updates lu
        INNER JOIN livestock l ON l.id = lu.livestock_id
        WHERE lu.farm_id = $1
          AND DATE_TRUNC('month', lu.created_at) = DATE_TRUNC('month', $2::date)
        GROUP BY l.type
        ORDER BY l.type ASC
      `,
      [scopedFarmId, monthDate]
    ),
    query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) AS expense
        FROM finance_entries
        WHERE farm_id = $1
          AND DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', $2::date)
      `,
      [scopedFarmId, monthDate]
    ),
    query(
      `
        SELECT l.id, l.task, l.target_label, l.created_at, u.name AS worker_name
        FROM daily_logs l
        INNER JOIN users u ON u.id = l.worker_id
        WHERE l.farm_id = $1
          AND DATE_TRUNC('month', l.created_at) = DATE_TRUNC('month', $2::date)
        ORDER BY l.created_at DESC
        LIMIT 12
      `,
      [scopedFarmId, monthDate]
    )
  ]);

  const income = Number(finance.rows[0]?.income || 0);
  const expense = Number(finance.rows[0]?.expense || 0);

  return {
    month: reportMonth,
    overview: {
      logCount: overview.rows[0]?.log_count || 0,
      activeWorkers: overview.rows[0]?.active_workers || 0,
      income,
      expense,
      net: income - expense
    },
    harvests: harvests.rows.map((row) => ({ ...row, total_quantity: Number(row.total_quantity || 0) })),
    inputs: inputs.rows.map((row) => ({ ...row, total_quantity: Number(row.total_quantity || 0) })),
    production: production.rows.map((row) => ({ ...row, total_metric: Number(row.total_metric || 0) })),
    recentLogs: logs.rows
  };
}

async function getWorkerContribution(auth, { month }) {
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  const monthDate = `${reportMonth}-01`;

  const [logs, records, assignments] = await Promise.all([
    query(
      `
        SELECT id, task, target_label, created_at
        FROM daily_logs
        WHERE worker_id = $1
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
        ORDER BY created_at DESC
        LIMIT 12
      `,
      [auth.sub, monthDate]
    ),
    query(
      `
        SELECT material_type, target_label, COALESCE(SUM(quantity), 0) AS total_quantity, unit
        FROM farm_activity_records
        WHERE worker_id = $1
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
        GROUP BY material_type, target_label, unit
        ORDER BY material_type ASC, target_label ASC
      `,
      [auth.sub, monthDate]
    ),
    query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          COUNT(*)::int AS total_count
        FROM worker_assignments
        WHERE worker_id = $1
      `,
      [auth.sub]
    )
  ]);

  return {
    month: reportMonth,
    overview: {
      logsSubmitted: logs.rows.length,
      completedAssignments: assignments.rows[0]?.completed_count || 0,
      totalAssignments: assignments.rows[0]?.total_count || 0
    },
    recentLogs: logs.rows,
    activityBreakdown: records.rows.map((row) => ({ ...row, total_quantity: Number(row.total_quantity || 0) }))
  };
}

module.exports = {
  getMonthlyReport,
  getSummary,
  getWorkerContribution
};
