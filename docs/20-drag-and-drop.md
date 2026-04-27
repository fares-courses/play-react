# 20 — Drag-and-drop

## What you're learning & why it matters

You're learning how to build sortable lists, kanban boards, and any "pick up an item, move it somewhere else" UI in React. The recommended library is **dnd-kit** — a modern, accessible, performant toolkit that's replaced older options (`react-dnd`, `react-beautiful-dnd`).

Why it matters: drag-and-drop done from scratch is one of the gnarliest UI problems in the browser — pointer/touch events, keyboard alternatives, accessibility announcements, virtualization, animation. dnd-kit handles all of it. Your job is mostly to give it the data and respond when something moves.

### Terms first

- **Draggable**: an item the user can pick up.
- **Droppable**: a target where draggables can be released.
- **Sortable**: a list where items can be reordered. A specialization built on draggable + droppable.
- **Sensor**: an input source — pointer, touch, keyboard. Each handles a different way to initiate a drag.
- **Collision detection**: the algorithm dnd-kit uses to determine which droppable the cursor is over.
- **Drag overlay**: a stylized "ghost" of the dragged item, rendered above everything else for smooth visual tracking.
- **Active vs over**: during a drag, "active" is what's being dragged; "over" is what it's currently on top of.

## Mental model

> **dnd-kit gives you the *events* and *state* of a drag operation. You give it the *data*. When a drag ends successfully, you update your state to match what the user did. The library doesn't own your data — it observes interactions and tells you what happened.**

This means dnd-kit composes naturally with `useState`, `useReducer`, TanStack Query — whatever already owns your list. You don't have to migrate state into the library.

## Setup

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Three packages:
- `core` — primitives (`DndContext`, `useDraggable`, `useDroppable`, sensors).
- `sortable` — the sortable-list specialization.
- `utilities` — small helpers like CSS transforms.

## A sortable list (the most common case)

```tsx
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

type Task = { id: string; title: string };

function SortableItem({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {task.title}
    </li>
  );
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "a", title: "Write doc" },
    { id: "b", title: "Review PR" },
    { id: "c", title: "Ship it" },
  ]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTasks((items) => {
      const oldIndex = items.findIndex(t => t.id === active.id);
      const newIndex = items.findIndex(t => t.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ul>{tasks.map(task => <SortableItem key={task.id} task={task} />)}</ul>
      </SortableContext>
    </DndContext>
  );
}
```

What's happening:

- **`<DndContext>`** is the outer wrapper that owns the drag state. `onDragEnd` fires when the user releases the item.
- **`<SortableContext items={ids}>`** declares this region is a sortable list with those IDs in that order. The `strategy` tells dnd-kit how items lay out (vertical/horizontal/grid) so it can animate properly.
- **`useSortable({ id })`** in each item gives you props to spread onto the DOM node:
  - `setNodeRef` — ref for the element.
  - `attributes` + `listeners` — pointer/keyboard event wiring.
  - `transform`, `transition` — values to apply for the live drag animation.
- **`arrayMove`** is a helper that moves an item from one index to another, returning a new array. Don't write your own — corner cases.

The `id` must be **string or number, stable, and unique within the SortableContext**. If you're tempted to use array indices, don't (doc 02). Use real IDs.

## Drag handles (only part of the item triggers drag)

By default, the whole item is the drag handle. To restrict it to e.g. an icon:

```tsx
function SortableItem({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id: task.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform) }}>
      <span>{task.title}</span>
      <button {...attributes} {...listeners}>≡</button>
    </li>
  );
}
```

Spread `attributes` and `listeners` onto the handle, not the whole item.

## Multi-column boards (kanban)

A kanban is multiple sortable lists where items can move *between* lists. Same primitives, slightly more bookkeeping:

```tsx
type Column = { id: string; title: string; taskIds: string[] };
type Board = { tasks: Record<string, Task>; columns: Record<string, Column>; columnOrder: string[] };

// On drag end:
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;
  const fromCol = findColumnContaining(active.id);
  const toCol = findColumnContaining(over.id) ?? findColumn(over.id); // dropped on a column directly
  if (fromCol === toCol) {
    // reorder within column with arrayMove
  } else {
    // remove from fromCol.taskIds, insert into toCol.taskIds at right position
  }
}
```

Each column is its own `SortableContext`. dnd-kit handles cross-list drags out of the box; you just have to update your data model.

For complex board state, use `useReducer` (doc 04) — drag operations have several state mutations that benefit from a single transition function.

## Drag overlay (smoother visuals)

By default, the dragged item visually transforms via CSS while still in its place in the list. For some UIs this looks weird (especially with virtualized or constrained lists). Use `<DragOverlay>` to render a stylized clone above everything:

```tsx
const [activeId, setActiveId] = useState<string | null>(null);

<DndContext
  onDragStart={(e) => setActiveId(e.active.id as string)}
  onDragEnd={(e) => { handleDragEnd(e); setActiveId(null); }}
>
  ...
  <DragOverlay>
    {activeId ? <li className="dragging-clone">{tasks.find(t => t.id === activeId)?.title}</li> : null}
  </DragOverlay>
</DndContext>
```

The original item can fade out (set `opacity: 0` when `isDragging`); the overlay renders the visible drag preview.

## Sensors and accessibility

dnd-kit ships sensors for pointer, touch, and **keyboard**. The keyboard sensor is the headline accessibility feature — users can press Space to pick up, arrows to move, Space to drop, Escape to cancel.

Set them up explicitly to enable nice defaults like activation distance (don't pick up on tiny accidental moves):

```tsx
import { PointerSensor, KeyboardSensor, useSensors, useSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

<DndContext sensors={sensors} ...>
```

Add **screen-reader announcements** with the `accessibility` prop on `DndContext` — dnd-kit announces "Picked up X. Moved to position 2 of 5. Dropped X over Y." Configure messages to fit your domain.

## Persisting reorder to the server

When `handleDragEnd` updates local state, you also need to tell the server. Pattern: optimistic local update + mutation:

```tsx
const reorder = useMutation({
  mutationFn: (newOrder: string[]) => api.post("/tasks/reorder", { order: newOrder }),
  onError: (err, vars, ctx) => {
    setTasks(ctx?.previous ?? tasks); // rollback
  },
});

function handleDragEnd(event: DragEndEvent) {
  const newTasks = arrayMove(tasks, oldIndex, newIndex);
  const previous = tasks;
  setTasks(newTasks);
  reorder.mutate(newTasks.map(t => t.id), { onError: () => setTasks(previous) });
}
```

For TanStack Query-managed lists, use `setQueryData` instead of `setTasks` and pair with `onMutate`/`onError`/`onSettled` (doc 10).

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/20-dnd/, install @dnd-kit/core, @dnd-kit/sortable,
@dnd-kit/utilities. Build:

1. SortableTodos: a single list of 6 todos that the user can reorder.
   Use real IDs, vertical strategy. Add a console.log of the new order
   on drag end.

2. KanbanBoard: 3 columns ("Todo", "Doing", "Done") with cards that can
   move within and across columns. Use useReducer for the board state.
   Each column is its own SortableContext.

3. DragHandle variant of SortableTodos: only a "≡" handle picks up; the
   rest of the row is non-draggable so links/buttons inside the row work.

4. Add a DragOverlay to the kanban so the dragged card appears as a
   styled clone above the columns; the original goes invisible.

5. Wire up keyboard sensor with proper announcements; manually test
   tab/space/arrow/escape and tell me what happens.

Use TypeScript strictly. Comment the dnd-kit concepts where they appear.
```

**2. Persistence exercise:**
```
Take the SortableTodos and persist reorders to a mock API. Use TanStack
Query: list comes from useQuery, reorder is a useMutation with optimistic
update. On API failure, roll back. Show me the onMutate/onError/onSettled
flow with comments.
```

**3. Accessibility audit:**
```
Run an accessibility audit on the kanban: keyboard navigation, screen
reader announcements, focus management after a drop, color/text contrast
on dragging states. List concrete fixes, then apply them.
```

## Checkpoints

1. What does `DndContext` own, and what do the inner Sortable items own?
2. Why must item IDs be stable and unique (not array indices)?
3. What does `useSortable` give you, and where do you spread `listeners` for a drag handle vs a whole-item drag?
4. When would you use `<DragOverlay>` instead of letting items animate in place?
5. What does the keyboard sensor enable, and why is it crucial?
6. What's the typical pattern for persisting a reorder to the server with optimistic UI?

## Footguns

- **Using array index as the dnd-kit `id`.** Reorder breaks because IDs change when items move.
- **Forgetting to spread `attributes` and `listeners`.** No drag interactions.
- **Making the whole item a drag handle when it contains buttons/links.** Buttons can become unclickable, accidental drags happen. Use a dedicated handle.
- **Setting `useSortable` with non-stable IDs (e.g., generated each render).** Same as above.
- **Skipping `onDragEnd`'s null-check.** `over` can be null if dropped outside any droppable. Crash without the guard.
- **Mutating the array in state.** dnd-kit doesn't care, but React does. Use `arrayMove` (returns new array) and pass to setter.
- **Ignoring keyboard accessibility.** Configure `KeyboardSensor` and `accessibility` announcements. This is the single highest-value a11y improvement for DnD.
- **Heavy items inside `SortableContext` re-rendering on every drag move.** Memoize items if performance suffers (doc 08).
- **Replacing `useSortable` with handwritten pointer events to "save a dependency."** Almost always a mistake; you'll re-implement edge cases poorly.

## Ask-the-agent cheatsheet

- *"Build a sortable list with dnd-kit. Items have a drag handle (only). Persist reorders to /api/reorder via TanStack Query useMutation with optimistic update."*
- *"Convert this single-list sortable to a kanban with N columns. Use useReducer for the board state, support cross-column drags."*
- *"Add a DragOverlay to this dnd-kit setup so the dragged item floats smoothly while the original fades out."*
- *"Audit this dnd-kit usage for accessibility: keyboard sensor, announcements, focus after drop, contrast. Fix issues."*
- *"My list is laggy during drag. Profile and tell me whether I need item memoization or virtualization or both."*

## Where this goes next

- **Doc 21** — Animations. dnd-kit's transitions are good; combine with Motion for entrance/exit animations.
