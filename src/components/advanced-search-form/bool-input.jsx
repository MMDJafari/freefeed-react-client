export function BoolInput({ label }) {
  return (
    <div className="checkbox">
      <label>
        <input type="checkbox" />
        {label}
      </label>
    </div>
  );
}
