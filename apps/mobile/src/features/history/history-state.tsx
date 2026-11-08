import type { UseQueryResult } from '@tanstack/react-query';
import { Card, ErrorState, Skeleton, SkeletonGroup, Text } from '@/components/ui';

// Loading, offline and error for a History view (docs/07 §6): never an empty chart while the
// numbers are still coming.
export function HistoryState({ query }: { query: UseQueryResult }) {
  if (query.error) {
    return (
      <Card>
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </Card>
    );
  }
  if (query.fetchStatus === 'paused') {
    return (
      <Card>
        <Text tone="secondary">Waiting for a connection…</Text>
      </Card>
    );
  }
  return (
    <SkeletonGroup label="Loading your history">
      <Skeleton shape="block" height={150} />
      <Skeleton shape="block" height={120} />
    </SkeletonGroup>
  );
}
