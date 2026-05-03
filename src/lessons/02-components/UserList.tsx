// Demonstrates: composing components together, typing an array prop, and using
// .map() with a key to render lists — the core JSX list-rendering pattern.

import { Card } from './Card'
import { Badge, roleToBadgeVariant } from './Badge'

type User = {
  id: number
  name: string
  role: string
}

type UserListProps = {
  users: User[]
}

export function UserList({ users }: UserListProps) {
  return (
    <div>
      {users.map((user) => (
        <Card key={user.id} title={user.name}>
          <Badge variant={roleToBadgeVariant(user.role)}>{user.role}</Badge>
        </Card>
      ))}
    </div>
  )
}
