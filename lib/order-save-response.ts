export function canApplySavedSnapshot(
  requestSnapshot: string,
  latestSnapshot: string
) {
  return requestSnapshot === latestSnapshot;
}
