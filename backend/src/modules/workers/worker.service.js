const { query, withTransaction } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { hashPassword } = require("../../utils/password");

function resolveFarmId(auth, explicitFarmId) {
  if (auth.role === "creator") {
    if (!explicitFarmId) {
      throw new AppError(422, "Farm ID is required.");
    }
    return explicitFarmId;
  }

  return auth.farmId;
}

async function listWorkers(auth, farmId) {
  const resolvedFarmId = resolveFarmId(auth, farmId);
  const result = await query(
    `
      SELECT id, name, email, duty, farm_id, employment_start_date, pay_rate, payment_status, created_at
      FROM users
      WHERE role = 'worker' AND farm_id = $1
      ORDER BY employment_start_date NULLS LAST, created_at DESC
    `,
    [resolvedFarmId]
  );

  return result.rows;
}

async function createWorker(auth, payload) {
  const farmId = resolveFarmId(auth, payload.farmId);
  const passwordHash = await hashPassword(payload.password);

  return withTransaction(async (client) => {
    const workerResult = await client.query(
      `
        INSERT INTO users (
          role, farm_id, name, email, password_hash, duty,
          employment_start_date, pay_rate, payment_status
        )
        VALUES ('worker', $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, email, duty, farm_id, employment_start_date, pay_rate, payment_status, created_at
      `,
      [
        farmId,
        payload.name,
        payload.email,
        passwordHash,
        payload.duty,
        payload.employmentStartDate || null,
        payload.payRate,
        payload.paymentStatus
      ]
    );

    const worker = workerResult.rows[0];

    if (payload.assignmentTitle && payload.assignmentDescription) {
      await client.query(
        `
          INSERT INTO worker_assignments (farm_id, worker_id, title, description, due_date, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [farmId, worker.id, payload.assignmentTitle, payload.assignmentDescription, payload.assignmentDueDate || null, auth.sub]
      );
    }

    return { worker };
  });
}

async function getWorker(auth, workerId) {
  const result = await query(
    `
      SELECT id, name, email, duty, farm_id, employment_start_date, pay_rate, payment_status, created_at
      FROM users
      WHERE id = $1 AND role = 'worker'
      LIMIT 1
    `,
    [workerId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Worker not found.");
  }

  const worker = result.rows[0];
  if (auth.role !== "creator" && worker.farm_id !== auth.farmId) {
    throw new AppError(403, "You can only access workers from your farm.");
  }

  return worker;
}

async function updateWorker(auth, workerId, payload) {
  const worker = await getWorker(auth, workerId);
  const result = await query(
    `
      UPDATE users
      SET name = $2,
          email = $3,
          duty = $4,
          employment_start_date = $5,
          pay_rate = $6,
          payment_status = $7
      WHERE id = $1
      RETURNING id, name, email, duty, farm_id, employment_start_date, pay_rate, payment_status, created_at
    `,
    [
      workerId,
      payload.name,
      payload.email,
      payload.duty,
      payload.employmentStartDate || null,
      payload.payRate,
      payload.paymentStatus
    ]
  );

  return result.rows[0];
}

async function createAssignment(auth, workerId, payload) {
  const worker = await getWorker(auth, workerId);
  if (auth.role === "worker") {
    throw new AppError(403, "Workers cannot assign duties.");
  }

  const result = await query(
    `
      INSERT INTO worker_assignments (farm_id, worker_id, title, description, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [worker.farm_id, workerId, payload.title, payload.description, payload.dueDate || null, auth.sub]
  );

  return result.rows[0];
}

async function listAssignments(auth, workerId) {
  let targetWorkerId = workerId;
  let farmId = auth.farmId;

  if (auth.role === "worker") {
    targetWorkerId = auth.sub;
  } else if (!targetWorkerId) {
    throw new AppError(422, "Worker ID is required.");
  } else {
    const worker = await getWorker(auth, workerId);
    farmId = worker.farm_id;
  }

  const result = await query(
    `
      SELECT id, title, description, due_date, status, created_at
      FROM worker_assignments
      WHERE worker_id = $1 AND farm_id = $2
      ORDER BY due_date NULLS LAST, created_at DESC
    `,
    [targetWorkerId, farmId]
  );

  return result.rows;
}

async function listFarmAssignments(auth) {
  const farmId = auth.role === "creator" ? null : auth.farmId;
  const params = [];
  const whereSql = farmId ? "WHERE wa.farm_id = $1" : "";
  if (farmId) {
    params.push(farmId);
  }

  const result = await query(
    `
      SELECT wa.id, wa.worker_id, wa.title, wa.description, wa.due_date, wa.status, wa.created_at,
             u.name AS worker_name
      FROM worker_assignments wa
      INNER JOIN users u ON u.id = wa.worker_id
      ${whereSql}
      ORDER BY wa.created_at DESC
    `,
    params
  );

  return result.rows;
}

async function updateAssignmentStatus(auth, workerId, assignmentId, status) {
  const worker = await getWorker(auth, workerId);
  const result = await query(
    `
      UPDATE worker_assignments
      SET status = $3
      WHERE id = $1 AND worker_id = $2 AND farm_id = $4
      RETURNING *
    `,
    [assignmentId, workerId, status, worker.farm_id]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Assignment not found.");
  }

  return result.rows[0];
}

module.exports = {
  createAssignment,
  createWorker,
  getWorker,
  listFarmAssignments,
  listAssignments,
  listWorkers,
  updateAssignmentStatus,
  updateWorker
};
