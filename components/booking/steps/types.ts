/** Pre-agreed step panel contract (ui-9-plus-audit contracts.md). */
export type StepPanelBaseProps = {
  onContinue: (value: unknown) => void;
  onBack?: () => void;
  loading?: boolean;
  className?: string;
};
