import { useEffect, useState } from "react";

export default function UserSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/users/active")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => {});
  }, []);
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">—</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}
