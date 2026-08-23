export function TimePresetTag({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="al-time-preset" onClick={onClick}>
      {label}
    </button>
  );
}
