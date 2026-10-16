const STATES = ['Normal', 'Hungry', 'Unhappy', 'Dirty', 'Low Energy', 'Audio'];
const MESSAGES = 'aiboard_meow_messages';
const TIMING = 'aiboard_meow_timing';
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function messageRow(configId, state, text, order) {
  const audio = state === 'Audio' ? JSON.parse(text) : null;
  return { config_id: configId, state, message: audio ? audio.url : text,
    is_audio: !!audio, audio_name: audio ? audio.name : null, sort_order: order };
}
const textOf = row => row.is_audio ? JSON.stringify({ name: row.audio_name, url: row.message }) : row.message;

/** Match unchanged lines first, so deleting one line does not rewrite its neighbours. */
export function matchLines(before, after) {
  const used = new Set();
  return after.map(text => {
    const index = before.findIndex((value, i) => value === text && !used.has(i));
    if (index >= 0) used.add(index);
    return index;
  });
}

export function planMeowChanges(configId, rows, timings, before, after, uuid = () => crypto.randomUUID()) {
  const ops = [];
  for (const state of STATES) {
    if (!same(before[state], after[state])) {
      const existing = rows.filter(r => r.state === state).sort((a, b) => a.sort_order - b.sort_order);
      const desired = after[state] || [];
      const matches = matchLines(existing.map(textOf), desired);
      const used = new Set(matches.filter(i => i >= 0));
      const spare = existing.map((_, i) => i).filter(i => !used.has(i));
      desired.forEach((text, order) => {
        const index = matches[order] >= 0 ? matches[order] : spare.shift();
        const next = messageRow(configId, state, text, order);
        if (index === undefined) ops.push({ table: MESSAGES, before: null, after: { id: uuid(), ...next } });
        else {
          used.add(index);
          const old = existing[index];
          if (Object.entries(next).some(([key, value]) => old[key] !== value))
            ops.push({ table: MESSAGES, before: old, after: { id: old.id, ...next } });
        }
      });
      existing.forEach((old, index) => {
        if (!used.has(index)) ops.push({ table: MESSAGES, before: old, after: null });
      });
    }
    const timing = after.timingConfigs?.[state];
    if (timing && !same(before.timingConfigs?.[state], timing)) {
      const old = timings.find(r => r.state === state);
      ops.push({ table: TIMING, before: old || null, after: {
        id: old?.id || uuid(), config_id: configId, state,
        message_duration_minutes: timing.messageDurationMinutes,
        message_interval_minutes: timing.messageIntervalMinutes, disabled: !!timing.disabled,
      } });
    }
  }
  return ops;
}

function guard(query, row, table) {
  const keys = table === MESSAGES
    ? ['id', 'config_id', 'state', 'message', 'is_audio', 'audio_name', 'sort_order']
    : ['id', 'config_id', 'state', 'message_duration_minutes', 'message_interval_minutes', 'disabled'];
  for (const key of keys) query = row[key] == null ? query.is(key, null) : query.eq(key, row[key]);
  return query;
}

/** Each confirmed operation advances the baseline; retries keep the same UUIDs. */
export async function executeMeowOperation(client, owner, op, isActive = () => true) {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!isActive() || auth?.user?.id !== owner) throw new Error('Account changed. Sign in again before saving.');
  let query;
  if (!op.before) query = client.from(op.table).upsert(op.after, { onConflict: 'id', ignoreDuplicates: true });
  else query = guard(op.after ? client.from(op.table).update(op.after) : client.from(op.table).delete(), op.before, op.table);
  const result = await query.select();
  if (result.error) throw result.error;
  if (result.data?.length === 1) return;
  // A previous request may have committed before its response was lost.
  const row = op.after || op.before;
  const receipt = await client.from(op.table).select('*').eq('id', row.id).eq('config_id', row.config_id).maybeSingle();
  if (receipt.error) throw receipt.error;
  if (!op.after && !receipt.data) return;
  if (op.after && receipt.data && Object.entries(op.after).every(([key, value]) => receipt.data[key] === value)) return;
  throw new Error('This dialogue changed in another session. Your draft is kept; reload before replacing it.');
}

export function createMeowSaver(client, owner, row, initial, onStatus, delay = 500) {
  let baseline = clone(initial), desired = clone(initial);
  let rows = clone(row.aiboard_meow_messages || []), timings = clone(row.aiboard_meow_timing || []);
  let timer, running = null, active = true, failed = false, batch = null;
  const status = (state, error = '') => { if (active) onStatus(state, error); };
  async function run() {
    if (running || !active) return running;
    running = (async () => {
      status('saving');
      try {
        while (active && (batch || !same(baseline, desired))) {
          if (!batch) {
            const target = clone(desired);
            batch = { target, ops: planMeowChanges(row.id, rows, timings, baseline, target) };
          }
          while (active && batch.ops.length) {
            const op = batch.ops[0];
            await executeMeowOperation(client, owner, op, () => active);
            const collection = op.table === MESSAGES ? rows : timings;
            const id = (op.after || op.before).id;
            const index = collection.findIndex(item => item.id === id);
            if (index >= 0) collection.splice(index, 1);
            if (op.after) collection.push(clone(op.after));
            batch.ops.shift();
          }
          if (!active) return;
          baseline = batch.target;
          batch = null;
        }
        status('saved');
      } catch (error) {
        failed = true;
        status('error', error instanceof Error ? error.message : 'Save failed. Your draft is kept. Retry saving.');
      }
    })();
    await running;
    running = null;
  }
  return {
    update(next) {
      if (!active) return;
      desired = clone(next);
      clearTimeout(timer);
      if (failed) return; // Explicit retry: never hide an unresolved conflict.
      status('saving');
      timer = setTimeout(run, delay);
    },
    retry() { clearTimeout(timer); failed = false; return run(); },
    async dispose() { active = false; clearTimeout(timer); await running; },
  };
}
