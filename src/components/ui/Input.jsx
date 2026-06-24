/**
 * Warm-styled text input for auth forms.
 */
export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-warmgray-800 font-sans"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className="
          w-full px-4 py-3 rounded-xl
          bg-cream-50 border border-cream-300
          text-warmgray-900 placeholder-warmgray-400
          font-sans text-sm
          outline-none
          transition-all duration-300
          focus:border-terra focus:ring-2 focus:ring-terra/20 focus:bg-white
          hover:border-warmgray-400
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      />
    </div>
  )
}
