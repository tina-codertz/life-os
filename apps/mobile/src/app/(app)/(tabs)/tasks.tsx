import type { PublicTask } from '@life-os/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { localToday } from '@/features/tasks/dates';
import {
  type TaskFilter,
  useCategories,
  useDeleteTask,
  useTasks,
  useToggleTask,
} from '@/features/tasks/queries';
import { TaskRow } from '@/features/tasks/task-row';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, useTheme } from '@/theme';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'TODO', label: 'To do' },
  { value: 'DONE', label: 'Done' },
  { value: 'ALL', label: 'All' },
];

const EMPTY: Record<TaskFilter, { title: string; description: string }> = {
  TODO: { title: 'Nothing to do', description: 'Add a task to get it out of your head.' },
  DONE: { title: 'Nothing done yet', description: 'Completed tasks show up here.' },
  ALL: { title: 'No tasks yet', description: 'Add your first task.' },
};

// The add/edit sheet: no id = new task.
function openTask(task?: PublicTask) {
  router.push(task ? { pathname: '/task-form', params: { id: task.id } } : '/task-form');
}

export default function Tasks() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<TaskFilter>('TODO');
  const tasks = useTasks(filter);
  const categories = useCategories();
  const toggle = useToggleTask();
  const remove = useDeleteTask();
  const today = localToday(useTimezone());

  const items = useMemo(() => tasks.data?.pages.flatMap((page) => page.items) ?? [], [tasks.data]);
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title1" accessibilityRole="header">
          Tasks
        </Text>
        <Button title="New task" size="sm" onPress={() => openTask()} />
      </View>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>
    </View>
  );

  // Four states (docs/07 §6): never an empty list while the first page is still loading.
  let empty: React.ReactElement;
  if (tasks.data === undefined && tasks.error) {
    empty = (
      <ErrorState
        error={tasks.error}
        onRetry={() => void tasks.refetch()}
        retrying={tasks.isFetching}
      />
    );
  } else if (tasks.data === undefined && tasks.fetchStatus === 'paused') {
    empty = <Text tone="secondary">Waiting for a connection…</Text>;
  } else if (tasks.data === undefined) {
    empty = (
      <SkeletonGroup label="Loading tasks">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} shape="block" height={48} />
        ))}
      </SkeletonGroup>
    );
  } else {
    empty = (
      <EmptyState
        {...EMPTY[filter]}
        {...(filter !== 'DONE' ? { action: { label: 'New task', onPress: () => openTask() } } : {})}
      />
    );
  }

  return (
    <FlatList
      testID="task-list"
      data={items}
      keyExtractor={(task) => task.id}
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
          today={today}
          onToggle={(done) => toggle.mutate({ id: item.id, done })}
          onOpen={() => openTask(item)}
          onDelete={() => remove.mutate(item)}
        />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        tasks.isFetchingNextPage ? (
          <ActivityIndicator
            accessibilityLabel="Loading more tasks"
            color={colors.accent.default}
          />
        ) : undefined
      }
      onEndReached={() => {
        if (tasks.hasNextPage && !tasks.isFetchingNextPage) void tasks.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={tasks.isRefetching && !tasks.isFetchingNextPage}
          onRefresh={() => void tasks.refetch()}
          tintColor={colors.accent.default}
        />
      }
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxxl,
        paddingHorizontal: spacing.lg,
      }}
    />
  );
}
