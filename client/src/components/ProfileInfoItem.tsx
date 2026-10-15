interface ProfileInfoItemProps {
  label: string;
  value: string;
}

const ProfileInfoItem = ({ label, value }: ProfileInfoItemProps) => {
  return (
    <div className="rounded-xl bg-slate-50/60 border border-slate-200 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800 wrap-break-words">
        {value}
      </p>
    </div>
  );
};

export default ProfileInfoItem;
