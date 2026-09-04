import { useCallback, useEffect, useRef, useState } from 'react';

import type { Skill } from '@/db/schema';
import { buildSkillRows, type SkillRow, skillRowsToInput } from '@/lib/character-values';
import { detachWrite } from '@/repositories/log';
import { replaceSkills } from '@/repositories/skills';

/**
 * The Compétences editor's draft rows, with debounced auto-save.
 *
 * It lives ABOVE the pager (the screen), not inside the editor: the pager stays
 * mounted across the read/edit toggle so the tab and scroll position survive it,
 * which means the rows can no longer be seeded by the editor's own mount.
 *
 * Single writer while editing: the rows are seeded from the saved skills each
 * time edit mode OPENS, we own them until it closes, and the whole set is
 * flushed through `replaceSkills` after a pause — plus once when edit mode
 * closes (or the screen unmounts), so the last keystroke is never lost.
 * Specializations are NOT in here: they are their own rows, written live.
 */
export function useSkillsDraft(characterId: number, skills: Skill[], editing: boolean) {
  const [rows, setRows] = useState<SkillRow[]>(() => buildSkillRows(skills));

  // Re-seed on the read → edit transition, during render (React's "adjust state
  // when a prop changes"): the first edit frame already shows the saved values.
  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) setRows(buildSkillRows(skills));
  }

  // Mirrored into a ref so the debounced flush reads the latest rows without
  // re-arming its timer. Assigned in an effect, not during render.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    // Fired from a debounce and from unmount, so there is nobody left to await
    // it — a rejected flush would otherwise lose the whole edit silently.
    detachWrite('skills', replaceSkills(characterId, skillRowsToInput(rowsRef.current)), {
      characterId,
    });
  }, [characterId]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);

  // Leaving edit mode, and unmounting, both settle any pending edit.
  useEffect(() => {
    if (!editing) flush();
  }, [editing, flush]);
  useEffect(() => flush, [flush]);

  const setValue = useCallback(
    (index: number, text: string) => {
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, value: text } : r)));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setAttribut = useCallback(
    (index: number, attribut: string) => {
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, attribut } : r)));
      scheduleSave();
    },
    [scheduleSave],
  );

  const addCustom = useCallback((name: string, attribut: string) => {
    setRows((prev) => [...prev, { name, attribut, value: '', isCustom: true }]);
  }, []);

  const remove = useCallback(
    (index: number) => {
      setRows((prev) => prev.filter((_, i) => i !== index));
      scheduleSave();
    },
    [scheduleSave],
  );

  return { rows, setValue, setAttribut, addCustom, remove, flush };
}
