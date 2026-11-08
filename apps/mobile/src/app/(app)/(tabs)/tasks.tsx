import type { PublicTask } from '@life-os/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, ScreenWash, TAB_BAR_SPACE } from '@/components/screen';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
  SkeletonGroup,
  Text,
  TextField,
} from '@/components/ui';
import { localToday } from '@/features/tasks/dates';
import {
  type TaskFilter,
  useCategories,
  useDeleteTask,
  useFocusCandidates,
  useTasks,
  useToggleTask,
} from '@/features/tasks/queries';
import { FocusCard } from '@/features/tasks/focus-card';
import { pickFocusTask } from '@/features/tasks/focus-task';
import { TaskRow } from '@/features/tasks/task-row';
import { useDebouncedValue } from '@/features/tasks/use-debounced-value';
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

// FR-TASK-005: completing a task doesn't complete its subtasks on its own; if some are still
// open, ask (the phone's own dialog). Unticking, or a task with none open, just goes ahead.
function completeOrAsk(
  task: PublicTask,
  done: boolean,
  toggle: (input: { id: string; done: boolean; includeSubtasks?: boolean }) => void,
) {
  const open = task.subtaskCount - task.subtasksDone;
  if (!done || open === 0) {
    toggle({ id: task.id, done });
    return;
  }
  Alert.alert(
    'Complete the subtasks too?',
    open === 1 ? '1 subtask isn’t done yet.' : `${open} subtasks aren’t done yet.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Only this task', onPress: () => toggle({ id: task.id, done }) },
      {
        text: 'Complete all',
        onPress: () => toggle({ id: task.id, done, includeSubtasks: true }),
      },
    ],
  );
}

// The add/edit sheet: no id = new task.
function openTask(task?: PublicTask) {
  router.push(task ? { pathname: '/task-form', params: { id: task.id } } : '/task-form');
}

export default function Tasks() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<TaskFilter>('TODO');
  // The design's search button opens a search field; closing it clears the search.
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const tasks = useTasks(filter, query);
  const categories = useCategories();
  const toggle = useToggleTask();
  const remove = useDeleteTask();
  const today = localToday(useTimezone());

  const loaded = useMemo(() => tasks.data?.pages.flatMap((page) => page.items) ?? [], [tasks.data]);
  // The design's highlighted card: on To do, when not searching. It isn't repeated below.
  const candidates = useFocusCandidates(today);
  const focus =
    filter === 'TODO' && !query ? pickFocusTask(candidates.data?.items ?? [], today) : null;
  const items = useMemo(
    () => (focus ? loaded.filter((t) => t.id !== focus.id) : loaded),
    [loaded, focus],
  );
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.xs }}>
      <ScreenHeader
        title="Tasks"
        actions={
          <IconButton
            icon={searchOpen ? 'close' : 'search'}
            accessibilityLabel={searchOpen ? 'Close search' : 'Search tasks'}
            onPress={() => {
              if (searchOpen) setSearch('');
              setSearchOpen(!searchOpen);
            }}
          />
        }
      />
      {searchOpen && (
        <TextField
          label="Search tasks"
          labelHidden
          icon="search"
          placeholder="Search tasks"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      )}
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            tint={colors.bg.surface}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>
      {focus && (
        <FocusCard
          task={focus}
          category={focus.categoryId ? categoryById.get(focus.categoryId) : undefined}
          today={today}
          onOpen={() => openTask(focus)}
          onComplete={() => completeOrAsk(focus, true, (input) => toggle.mutate(input))}
        />
      )}
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
    empty = (
      <Card>
        <Text tone="secondary">Waiting for a connection…</Text>
      </Card>
    );
  } else if (tasks.data === undefined) {
    empty = (
      <SkeletonGroup label="Loading tasks">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} shape="block" height={68} />
        ))}
      </SkeletonGroup>
    );
  } else if (query) {
    empty = (
      <Card>
        <EmptyState
          title={`No tasks match “${query}”`}
          description="Try another word, or another filter."
          mascot="sleepy"
          action={{ label: 'Clear search', onPress: () => setSearch('') }}
        />
      </Card>
    );
  } else {
    empty = (
      <Card>
        <EmptyState
          {...EMPTY[filter]}
          mascot="sleepy"
          {...(filter !== 'DONE'
            ? { action: { label: 'New task', icon: 'add', onPress: () => openTask() } }
            : {})}
        />
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <FlatList
        testID="task-list"
        data={items}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
            today={today}
            onToggle={(done) => completeOrAsk(item, done, (input) => toggle.mutate(input))}
            onOpen={() => openTask(item)}
            onDelete={() => remove.mutate(item)}
          />
        )}
        ListHeaderComponent={header}
        {...(focus ? {} : { ListEmptyComponent: empty })}
        ListFooterComponent={
          tasks.isFetchingNextPage ? (
            <ActivityIndicator
              accessibilityLabel="Loading more tasks"
              color={colors.text.secondary}
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
            tintColor={colors.text.secondary}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_SPACE,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: spacing.gutter,
          bottom: Math.max(insets.bottom, spacing.gutter) + 68 + spacing.lg,
        }}
      >
        <IconButton
          icon="add"
          variant="ink"
          size={56}
          accessibilityLabel="New task"
          onPress={() => openTask()}
        />
      </View>
    </View>
  );
}
