export default function StaffLayout({ children }) {
  // Cancel the root layout's pt-20 (public navbar spacing)
  return <div className="-mt-10">{children}</div>;
}
