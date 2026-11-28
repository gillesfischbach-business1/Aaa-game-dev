import { describe, expect, it } from 'vitest';
import { MissionTracker } from '../src/core/missions';
import { missionDef, nextObjective } from '../src/game/missiondata';

describe('Missionsdaten aus Data/Missions/missions_main.json', () => {
  it('M01 und M02 lassen sich registrieren', () => {
    const t = new MissionTracker();
    expect(t.register(missionDef('M01_ZERECK_AN_DSTAD')).ok).toBe(true);
    expect(t.register(missionDef('M02_ENG_LESCHT_CHANCE')).ok).toBe(true);
  });

  it('M05 hat drei alternative Loesungswege', () => {
    const def = missionDef('M05_DEI_VERLUER_DISKETT');
    const group = def.objectives.filter((o) => o.alternativeGroup === 'find_disk').map((o) => o.id);
    expect(group).toEqual(['find_via_forum', 'find_via_phonebook', 'find_via_witness']);
    for (const path of group) {
      const t = new MissionTracker();
      const d = { ...def, prerequisites: [] };
      t.register(d);
      t.refresh({ year: 1998, month: 4, day: 22 });
      t.start(d.id);
      for (const o of ['listen_tom', 'talk_technician', path, 'return_disk']) t.completeObjective(d.id, o);
      expect(t.getState(d.id)).toBe('Succeeded');
    }
  });

  it('M02 erst nach M01 verfuegbar', () => {
    const t = new MissionTracker();
    t.register(missionDef('M01_ZERECK_AN_DSTAD'));
    t.register(missionDef('M02_ENG_LESCHT_CHANCE'));
    t.refresh({ year: 1998, month: 4, day: 20 });
    expect(t.getState('M02_ENG_LESCHT_CHANCE')).toBe('Locked');
    t.start('M01_ZERECK_AN_DSTAD');
    for (const o of ['arrive_station', 'call_friend', 'get_key', 'find_car', 'visit_friend']) t.completeObjective('M01_ZERECK_AN_DSTAD', o);
    t.refresh({ year: 1998, month: 4, day: 20 });
    expect(t.getState('M02_ENG_LESCHT_CHANCE')).toBe('Available');
  });

  it.each([['trial_repair_honest'], ['trial_repair_shortcut']])('M02 ist mit %s abschliessbar', (path) => {
    const t = new MissionTracker();
    const def = missionDef('M02_ENG_LESCHT_CHANCE');
    def.prerequisites = [];
    t.register(def);
    t.refresh({ year: 1998, month: 4, day: 20 });
    t.start(def.id);
    const done = (id: string) => t.isObjectiveDone(def.id, id);
    expect(nextObjective(def, done)).toBe('listen_message');
    t.completeObjective(def.id, 'listen_message');
    t.completeObjective(def.id, 'meet_contact');
    expect(nextObjective(def, done)).toBe('group:trial');
    t.completeObjective(def.id, path);
    expect(nextObjective(def, done)).toBe('test_drive');
    t.completeObjective(def.id, 'test_drive');
    t.completeObjective(def.id, 'report_to_owner');
    expect(t.getState(def.id)).toBe('Succeeded');
  });

  it('Zu spaet: Fehlschlag und Neustart ab Checkpoint', () => {
    const t = new MissionTracker();
    const def = missionDef('M02_ENG_LESCHT_CHANCE');
    def.prerequisites = [];
    t.register(def);
    t.refresh({ year: 1998, month: 4, day: 20 });
    t.start(def.id);
    t.completeObjective(def.id, 'listen_message');
    expect(t.fail(def.id, 'late_for_trial')).toBe(true);
    expect(t.restartFromCheckpoint(def.id)).toBe(true);
    expect(t.isObjectiveDone(def.id, 'listen_message')).toBe(true);
  });
});

describe('M08 Millennium', () => {
  it('erst ab 1. Dezember 1998 verfuegbar und nur bis 31. Dezember', () => {
    const t = new MissionTracker();
    const def = { ...missionDef('M08_MILLENNIUM'), prerequisites: [] };
    t.register(def);
    t.refresh({ year: 1998, month: 11, day: 30 });
    expect(t.getState(def.id)).toBe('Locked');
    t.refresh({ year: 1998, month: 12, day: 1 });
    expect(t.getState(def.id)).toBe('Available');
    const t2 = new MissionTracker();
    t2.register(def);
    t2.refresh({ year: 1999, month: 1, day: 2 });
    expect(t2.getState(def.id)).toBe('Locked');
  });
});
