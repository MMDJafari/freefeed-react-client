import { useContext, useId } from 'react';
import { useEvent } from 'react-use-event-hook';
import style from './advanced-search-form.module.scss';
import { filtersContext } from './context';
import { removeFilter, setFilter } from './reducer';

export function ChooseInput({ label, children: options, filter }) {
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
      <select
        className="form-control"
        id={id}
        value={filter in filters ? filters[filter] : ''}
        onChange={onChange}
      >
        {options}
      </select>
    </div>
  );
}
