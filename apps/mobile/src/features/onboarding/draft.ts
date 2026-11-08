import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { FocusAreaKey } from './focus-areas';

// Answers collected across the onboarding screens, sent together at the end (or not at all
// if the user skips). In memory only: an interrupted onboarding simply starts again.
export interface OnboardingDraft {
  displayName: string | null;
  timezone: string | null;
  followDeviceTimezone: boolean;
  focusAreas: FocusAreaKey[];
}

const EMPTY: OnboardingDraft = {
  displayName: null,
  timezone: null,
  followDeviceTimezone: true,
  focusAreas: [],
};

export const onboardingDraft = createStore<OnboardingDraft>()(() => EMPTY);

export const useOnboardingDraft = () => useStore(onboardingDraft);
export const updateDraft = (changes: Partial<OnboardingDraft>) => onboardingDraft.setState(changes);
export const resetDraft = () => onboardingDraft.setState(EMPTY, true);
