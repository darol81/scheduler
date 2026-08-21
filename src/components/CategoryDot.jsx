export default function CategoryDot({ color, size = 10 }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ backgroundColor: color || '#94a3b8', width: size, height: size }}
      aria-hidden="true"
    />
  )
}
