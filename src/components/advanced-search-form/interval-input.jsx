import { useId } from 'react';
import style from './advanced-search-form.module.scss';

export function IntervalInput({ label }) {
  const id = useId();
  return (
    <div className={style.inputRow}>
      <label htmlFor={id}>{label}</label>
      <div className={style.intervalBox}>
        <select className="form-control">
          <option value="&lt;">&lt;</option>
          <option value="&lt;=">&lt;=</option>
          <option value="=">=</option>
          <option value="&gt;=" selected>
            &gt;=
          </option>
          <option value="&gt;">&gt;</option>
        </select>
        <input type="number" className="form-control" placeholder="0" id={id} />
      </div>
    </div>
  );
}
