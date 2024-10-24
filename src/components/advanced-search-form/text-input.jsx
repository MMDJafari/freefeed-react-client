import { useId } from 'react';
import style from './advanced-search-form.module.scss';

export function TextInput({ label, placeholder = '', type = 'text' }) {
  const id = useId();
  return (
    <div className={style.inputRow}>
      <label htmlFor={id}>{label}</label>
      <input type={type} className="form-control" placeholder={placeholder} id={id} />
    </div>
  );
}
