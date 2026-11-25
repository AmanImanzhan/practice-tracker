import { StyleSheet } from 'react-native';

// Shared column flex-ratios so DayTableHeader and DayRow stay aligned.
export const dayTableColumns = StyleSheet.create({
  date: { flex: 1.35 },
  number: { flex: 0.6, textAlign: 'center' },
  day: { flex: 0.6 },
  time: { flex: 1.1 },
  repertoire: { flex: 1.9 },
  // Wide enough for the "NOTE" header label to fit on one line at any font scale —
  // the data-row icon it also holds only ever needed a fraction of this.
  note: { flex: 0.75, alignItems: 'center' },
});
