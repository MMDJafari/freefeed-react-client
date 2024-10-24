import { useId } from 'react';
import style from './advanced-search-form.module.scss';

export function ChooseInput({ label, children: options }) {
  const id = useId();
  return (
    <div className={style.inputRow}>
      <label htmlFor={id}>{label}</label>
      <select className="form-control" id={id}>
        {options}
      </select>
    </div>
  );
}
