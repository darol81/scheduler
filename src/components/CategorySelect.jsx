import { useId } from 'react'

/** Plain <select> over the user's active categories. */
export default function CategorySelect({
  categories,
  value,
  onChange,
  label = 'Category',
  includeAllOption = false,
  allLabel = 'All categories',
  id,
}) {
  const generatedId = useId()
  const selectId = id || generatedId

  return (
    <div>
      {label ? (
        <label className="label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className="input"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeAllOption ? <option value="">{allLabel}</option> : null}
        {!includeAllOption && !value ? (
          <option value="" disabled>
            Choose a category
          </option>
        ) : null}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  )
}
