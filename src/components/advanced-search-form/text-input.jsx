import { useContext, useId } from 'react';
import { useEvent } from 'react-use-event-hook';
import style from './advanced-search-form.module.scss';
import { filtersContext } from './context';
import { removeFilter, setFilter } from './reducer';

export function TextInput({ label, placeholder = '', type = 'text', filter }) {
  const id = useId();
  const [filters, dispatch] = useContext(filtersContext);
  const onChange = useEvent((e) => {
    const v = e.target.value;
    if (v.trim() !== '') {
      dispatch(setFilter(filter, v));
    } else {
      dispatch(removeFilter(filter));
    }
  });
  return (
    <div className={style.inputRow}>
      <label htmlFor={id}>{label}</label>
      <input
        type={type}
        className="form-control"
        placeholder={placeholder}
        id={id}
        onChange={onChange}
        value={filter in filters ? filters[filter] : ''}
      />
    </div>
  );
}
