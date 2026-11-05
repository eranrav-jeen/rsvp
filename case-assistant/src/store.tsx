import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';

export type DobDecision = 'pending' | 'editing' | 'approved' | 'edited' | 'rejected';
export type QState = 'open' | 'asked' | 'skipped';
export type CState = 'open' | 'explained' | 'dismissed' | 'asked';
export type Choice = '' | 'approve' | 'conditional' | 'hold' | 'reject';

export interface DemoState {
  intake: {
    doc: string;
    hl: string;
    /** bumps on every "show in source" click so the viewer re-scrolls even to the same field */
    hlSeq: number;
    decision: DobDecision;
    editVal: string;
    editNote: string;
    requestSent: boolean;
    editingDraft: boolean;
    draft: string | null;
  };
  file: { focusOff: Record<number, boolean> };
  interview: {
    lang: 'he' | 'en';
    topic: 'all' | 'met' | 'routine' | 'family' | 'home';
    q: Record<string, QState>;
    c: Record<string, CState>;
    paused: boolean;
    /** seconds on the live interview clock */
    clock: number;
    /** how many transcript messages are revealed (demo playback) */
    revealed: number;
  };
  decision: { choice: Choice; reason: string; confirmed: boolean; signed: boolean };
}

export const INTERVIEW_START = 23 * 60 + 41;
export const MESSAGE_COUNT = 8;

export const initialState: DemoState = {
  intake: {
    doc: 'passport', hl: '', hlSeq: 0, decision: 'pending', editVal: '14.03.1994', editNote: '',
    requestSent: false, editingDraft: false, draft: null,
  },
  file: { focusOff: {} },
  interview: {
    lang: 'he', topic: 'all',
    q: { q1: 'open', q2: 'open', q3: 'open', q4: 'open', q5: 'open', q6: 'open' },
    c: { '1': 'open', '2': 'open', '3': 'open' },
    paused: false, clock: INTERVIEW_START, revealed: 0,
  },
  decision: { choice: '', reason: '', confirmed: false, signed: false },
};

type Section = keyof DemoState;
export type Action =
  | { [K in Section]: { type: 'patch'; section: K; patch: Partial<DemoState[K]> } }[Section]
  | { type: 'reset' }
  | { type: 'tick' };

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'reset':
      return initialState;
    case 'tick':
      return { ...state, interview: { ...state.interview, clock: state.interview.clock + 1 } };
    case 'patch':
      return { ...state, [action.section]: { ...state[action.section], ...action.patch } };
  }
}

const Ctx = createContext<{ state: DemoState; dispatch: Dispatch<Action> } | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  const { state, dispatch } = ctx;
  return {
    state,
    dispatch,
    setIntake: (patch: Partial<DemoState['intake']>) => dispatch({ type: 'patch', section: 'intake', patch }),
    setFile: (patch: Partial<DemoState['file']>) => dispatch({ type: 'patch', section: 'file', patch }),
    setInterview: (patch: Partial<DemoState['interview']>) => dispatch({ type: 'patch', section: 'interview', patch }),
    setDecision: (patch: Partial<DemoState['decision']>) => dispatch({ type: 'patch', section: 'decision', patch }),
  };
}

/** Shared derived values used on more than one screen. */
export const DECISION_LABEL: Record<Exclude<Choice, ''>, string> = {
  approve: 'אישור', conditional: 'אישור מותנה', hold: 'השהיה לבירור', reject: 'דחייה',
};

export function dobResolved(s: DemoState) {
  return s.intake.decision === 'approved' || s.intake.decision === 'edited';
}
