import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planMeowChanges, executeMeowOperation, createMeowSaver } from '../src/lib/persistMeowChanges.mjs';
const table = 'aiboard_meow_messages';
const config = lines => ({ Normal: lines, Audio: [], timingConfigs: {} });
const row = (id, message, sort_order = 0) => ({ id, config_id: 'config', state: 'Normal', message, sort_order, is_audio: false, audio_name: null });
function fake(initial) {
  const db = { rows: structuredClone(initial), owner: 'owner', fail: false, lost: false, writes: 0 };
  db.auth = { getUser: async () => ({ data: { user: { id: db.owner } } }) };
  db.from = () => {
    let mode = 'read', value, filters = [];
    const query = {
      eq(key, val) { filters.push(r => r[key] === val); return query; },
      is(key, val) { return query.eq(key, val); },
      select() { return query; }, maybeSingle() { return query.then(r => ({ ...r, data: r.data?.[0] || null })); },
      upsert(v) { mode = 'insert'; value = v; return query; },
      update(v) { mode = 'update'; value = v; return query; },
      delete() { mode = 'delete'; return query; },
      async then(resolve, reject) {
        try {
          if (mode !== 'read' && db.fail) return resolve({ error: new Error('offline') });
          let found = db.rows.filter(r => filters.every(f => f(r)));
          if (mode !== 'read') db.writes++;
          if (mode === 'insert') {
            found = db.rows.some(r => r.id === value.id) ? [] : [structuredClone(value)]; db.rows.push(...found);
          } else if (mode === 'update') found.forEach(r => Object.assign(r, value));
          else if (mode === 'delete') db.rows = db.rows.filter(r => !found.includes(r));
          if (mode !== 'read' && db.lost) { db.lost = false; return resolve({ error: new Error('lost response') }); }
          return resolve({ data: structuredClone(found) });
        } catch (e) { return reject(e); }
      },
    }; return query;
  }; return db;
}
test('deleting a line preserves other IDs and unrelated states', () => {
  const ops = planMeowChanges('config', [row('a', 'A'), row('b', 'B', 1), { ...row('h', 'Hungry'), state: 'Hungry' }], [], config(['A', 'B']), config(['B']));
  assert.equal(ops.length, 2);
  assert.equal(ops.find(op => !op.after).before.id, 'a');
  assert.equal(ops.find(op => op.after).after.id, 'b');
});
test('unchanged configuration writes nothing', () => {
  assert.deepEqual(planMeowChanges('config', [row('a', 'A')], [], config(['A']), config(['A'])), []);
});
test('timing edits do not touch message rows', () => {
  const ops = planMeowChanges('config', [row('a', 'A')], [], config(['A']), { ...config(['A']), timingConfigs: { Normal: { messageDurationMinutes: 1, messageIntervalMinutes: 2 } } }, () => 'uuid');
  assert.equal(ops.length, 1); assert.equal(ops[0].table, 'aiboard_meow_timing');
});
test('concurrent edit is rejected without overwriting it', async () => {
  const db = fake([row('a', 'remote')]);
  await assert.rejects(executeMeowOperation(db, 'owner', { table, before: row('a', 'A'), after: row('a', 'local') }), /another session/);
  assert.equal(db.rows[0].message, 'remote');
});
test('account mismatch prevents writes', async () => {
  const db = fake([]); db.owner = 'other';
  await assert.rejects(executeMeowOperation(db, 'owner', { table, before: null, after: row('a', 'A') }), /Account changed/);
  assert.equal(db.writes, 0);
});
test('lost insert response can retry without duplicate rows', async () => {
  const db = fake([]); db.lost = true;
  const op = { table, before: null, after: row('a', 'A') };
  await assert.rejects(executeMeowOperation(db, 'owner', op));
  await executeMeowOperation(db, 'owner', op);
  assert.equal(db.rows.length, 1);
});
test('lost update and delete receipts recover on retry', async () => {
  const db = fake([row('a', 'A')]);
  for (const op of [{ table, before: row('a', 'A'), after: row('a', 'B') }, { table, before: row('a', 'B'), after: null }]) {
    db.lost = true;
    await assert.rejects(executeMeowOperation(db, 'owner', op));
    await executeMeowOperation(db, 'owner', op);
  }
  assert.equal(db.rows.length, 0);
});
test('queue keeps a failed draft and retries, preserving unknown remote additions', async () => {
  const db = fake([row('a', 'A'), row('remote', 'remote', 10)]), statuses = [];
  const saver = createMeowSaver(db, 'owner', { id: 'config', aiboard_meow_messages: [row('a', 'A')] }, config(['A']), s => statuses.push(s), 10000);
  db.fail = true; saver.update(config(['B'])); await saver.retry();
  assert.equal(statuses.at(-1), 'error'); assert.equal(db.rows[0].message, 'A');
  db.fail = false; await saver.retry();
  assert.equal(statuses.at(-1), 'saved'); assert.deepEqual(db.rows.map(r => r.message), ['B', 'remote']);
  await saver.dispose();
});
test('rapid updates persist latest draft and disposal cancels pending save', async () => {
  const db = fake([row('a', 'A')]);
  const saver = createMeowSaver(db, 'owner', { id: 'config', aiboard_meow_messages: [row('a', 'A')] }, config(['A']), () => {}, 10000);
  saver.update(config(['B'])); saver.update(config(['C'])); await saver.retry();
  assert.equal(db.rows[0].message, 'C'); assert.equal(db.writes, 1);
  saver.update(config(['D'])); await saver.dispose(); await saver.retry();
  assert.equal(db.rows[0].message, 'C');
});
test('new edits during an in-flight save are serialized and eventually saved', async () => {
  const db = fake([row('a', 'A')]);
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  let calls = 0;
  db.auth.getUser = async () => {
    if (++calls === 1) { entered(); await blocked; }
    return { data: { user: { id: 'owner' } } };
  };
  const saver = createMeowSaver(db, 'owner', { id: 'config', aiboard_meow_messages: [row('a', 'A')] }, config(['A']), () => {}, 10000);
  saver.update(config(['B'])); const pending = saver.retry(); await started;
  saver.update(config(['C'])); release(); await pending;
  assert.equal(db.rows[0].message, 'C'); assert.equal(db.writes, 2);
  await saver.dispose();
});
test('disposal during authentication prevents the queued write', async () => {
  const db = fake([row('a', 'A')]);
  let release;
  db.auth.getUser = () => new Promise(resolve => { release = () => resolve({ data: { user: { id: 'owner' } } }); });
  const saver = createMeowSaver(db, 'owner', { id: 'config', aiboard_meow_messages: [row('a', 'A')] }, config(['A']), () => {}, 10000);
  saver.update(config(['B'])); const pending = saver.retry(); const disposed = saver.dispose();
  release(); await pending; await disposed;
  assert.equal(db.writes, 0);
});
test('audio remains audio and text edits do not replace it', () => {
  const before = { ...config(['A']), Audio: [JSON.stringify({ name: 'purr', url: 'data:audio/wav;base64,abc' })] };
  const ops = planMeowChanges('config', [row('a', 'A')], [], before, { ...before, Normal: ['B'] });
  assert.equal(ops.length, 1); assert.equal(ops[0].after.is_audio, false);
  const audioOps = planMeowChanges('config', [], [], config([]), { ...config([]), Audio: before.Audio });
  assert.equal(audioOps[0].after.audio_name, 'purr'); assert.equal(audioOps[0].after.is_audio, true);
});
