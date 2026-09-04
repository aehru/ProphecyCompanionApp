import React from 'react';
import { IconButton } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { openRoller } from '@/lib/dice-roller';

/**
 * The header entry point to the app-level dice roller (see `lib/dice-roller`).
 *
 * It goes in a navigator's `headerRight` rather than the FAB stack: four of the
 * five character tabs already stack one or two FABs bottom-right, and a third
 * one there would read as a third main action for the screen — which rolling
 * dice is not. Every stack sets it once in `screenOptions`; the one screen that
 * overrides `headerRight` itself (the Fiche, for its sheet pencil) renders this
 * beside its own button.
 */
export default function DiceRollerButton() {
  return <IconButton testID="dice-roller" icon={dsIcon('dice')} onPress={() => openRoller()} />;
}
