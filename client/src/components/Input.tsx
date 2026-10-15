import React from "react";
interface ButtonProps {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "number" | "password" | "email";
  placeholder?: string;
  value?: string | number;
  label?: string;
}
const Input = ({
  placeholder,
  type = "text",
  onChange,
  value,
  label,
}: ButtonProps) => {
  return (
    <div className="flex flex-col">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="border border-gray-300 rounded-sm px-2 h-9 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
};

export default Input;
