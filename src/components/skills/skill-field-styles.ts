// The one measurement the base rows and the specialization rows must agree on:
// the width of the value field, so the two line up down the column.

import { StyleSheet } from 'react-native';

export const skillFieldStyles = StyleSheet.create({
  valueField: { flexGrow: 0, flexBasis: 'auto', minWidth: 0, width: 64 },
});
