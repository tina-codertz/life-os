import { View } from 'react-native';
import { Chip, ListRow, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { useGoals } from './queries';

// The task sheet's Goal row (FR-GOAL-004): which goal the task counts towards, and optionally
// which of its milestones (your choice, "Due 28 Nov · 3 tasks"). Changing the goal clears the
// milestone, as the server does. Only active goals are offered, plus the task's own goal.
export function GoalRow({
  goalId,
  milestoneId,
  onChange,
  error,
}: {
  goalId: string | null;
  milestoneId: string | null;
  onChange: (link: { goalId: string | null; milestoneId: string | null }) => void;
  error?: string | undefined;
}) {
  const { colors } = useTheme();
  const goals = useGoals().data ?? [];
  const choices = goals.filter((g) => g.status === 'ACTIVE' || g.id === goalId);
  const goal = goals.find((g) => g.id === goalId);
  const milestone = goal?.milestones.find((m) => m.id === milestoneId);
  // Milestones still to do, plus the task's own one if it's done.
  const steps =
    goal?.milestones.filter((m) => m.completedAt === null || m.id === milestoneId) ?? [];
  if (choices.length === 0 && !goalId) return null;

  return (
    <ListRow
      icon="flag"
      tint={colors.tile.lime}
      title="Goal"
      value={goal ? (milestone ? `${goal.title} · ${milestone.title}` : goal.title) : 'None'}
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Goal"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        <Chip
          label="No goal"
          selected={!goalId}
          onPress={() => onChange({ goalId: null, milestoneId: null })}
        />
        {choices.map((g) => (
          <Chip
            key={g.id}
            label={g.title}
            selected={g.id === goalId}
            onPress={() =>
              onChange({ goalId: g.id, milestoneId: g.id === goalId ? milestoneId : null })
            }
          />
        ))}
      </View>
      {goal && steps.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="label">
            Milestone
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Milestone"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
          >
            <Chip
              label="Just the goal"
              selected={!milestoneId}
              onPress={() => onChange({ goalId: goal.id, milestoneId: null })}
            />
            {steps.map((m) => (
              <Chip
                key={m.id}
                label={m.title}
                selected={m.id === milestoneId}
                onPress={() => onChange({ goalId: goal.id, milestoneId: m.id })}
              />
            ))}
          </View>
        </View>
      )}
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </ListRow>
  );
}
