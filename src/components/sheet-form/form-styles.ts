// Grid geometry shared by the sheet form's tabs, so the columns line up from one
// tab to the next.

import { StyleSheet } from 'react-native';

export const formStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  col2: { flexBasis: '45%', minWidth: 0 },
  // 4 even columns on one row (the 4 attributs).
  col4: { flex: 1, flexBasis: 0, minWidth: 0 },
});
