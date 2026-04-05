export default function Spinner({ size = 8, color = 'border-flame' }) {
  return (
    <div
      className={`w-${size} h-${size} border-4 ${color} border-t-transparent rounded-full animate-spin`}
    />
  );
}
