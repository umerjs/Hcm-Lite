import { useState, type ChangeEvent } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface PasswordInputProps {
  placeholder?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  value?: string;
  className?: string;
  label?: string;
}
const PasswordInput = ({
  placeholder,
  onChange,
  label,
  value,
  className = "",
}: PasswordInputProps) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          className={`input w-full border border-blue-600 rounded-sm px-2 py-2 pr-11 ${className}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-stone-400 transition-colors hover:text-ink"
        >
          {show ? (
            <FiEyeOff className="h-4.5 w-4.5" />
          ) : (
            <FiEye className="h-4.5 w-4.5" />
          )}
        </button>
      </div>
    </div>
  );
};
export default PasswordInput;
