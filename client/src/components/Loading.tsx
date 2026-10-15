export default function SpinnerLoader() {
  return (
    <div className="flex items-center justify-center min-h-50">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
