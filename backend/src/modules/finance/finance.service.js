const { query } = require("../../config/db");

async function listEntries(auth, { month }) {
  const params = [auth.farmId];
  let dateCondition = "";

  if (month) {
    params.push(`${month}-01`);
    dateCondition = `AND DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', $${params.length}::date)`;
  }

  const [entriesResult, summaryResult] = await Promise.all([
    query(
      `
        SELECT id, entry_type, category, amount, entry_date, notes, created_at
        FROM finance_entries
        WHERE farm_id = $1
        ${dateCondition}
        ORDER BY entry_date DESC, created_at DESC
      `,
      params
    ),
    query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
        FROM finance_entries
        WHERE farm_id = $1
        ${dateCondition}
      `,
      params
    )
  ]);

  const totals = summaryResult.rows[0];
  const income = Number(totals.total_income || 0);
  const expense = Number(totals.total_expense || 0);

  return {
    entries: entriesResult.rows,
    summary: {
      income,
      expense,
      net: income - expense
    }
  };
}

async function createEntry(auth, payload) {
  const result = await query(
    `
      INSERT INTO finance_entries (farm_id, entry_type, category, amount, entry_date, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, entry_type, category, amount, entry_date, notes, created_at
    `,
    [auth.farmId, payload.entryType, payload.category, payload.amount, payload.entryDate, payload.notes || null, auth.sub]
  );

  return result.rows[0];
}

module.exports = {
  createEntry,
  listEntries
};
