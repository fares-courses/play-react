# 22 — Animations

## What you're learning & why it matters

You're learning when to animate, what tools to reach for, and the common patterns: enter/exit animations, layout animations (items smoothly moving when they reorder), gestures, page transitions. Done well, animation makes UIs feel responsive and explainable; done badly, it makes them feel slow or twitchy.

The default tool for advanced animation in modern React is **Motion** (formerly Framer Motion). For simple stuff, plain CSS transitions are fine and lighter. We'll cover both.

### Terms first

- **Transition (CSS)**: a smooth change between two values when a CSS property changes (e.g., `width: 100px` to `width: 200px` over 300ms).
- **Animation (CSS)**: a multi-keyframe sequence defined with `@keyframes`.
- **Spring**: a physics-based animation (mass, stiffness, damping) — feels more natural than fixed-duration tweens for many UI cases.
- **Tween**: a fixed-duration interpolation between values, typically with an easing curve (ease-in-out, etc.).
- **Stagger**: starting animations of multiple items at offset times for a "wave" effect.
- **Layout animation**: when an element changes position in the layout (e.g., reordering a list), animating that movement automatically.
- **AnimatePresence**: Motion's mechanism for animating elements as they enter and leave the React tree.

## Mental model

> **Animations are state changes over time. Plain CSS handles "the simple case where one property smoothly changes between two values." Motion handles "anything richer" — enter/exit, springs, layout, gestures, orchestration. Reach for Motion when CSS gets awkward, not before.**

## Plain CSS first

For most "hover state" / "open/close transitions" / "fade in this element," you don't need a library:

```css
.card {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}
.card:hover { transform: translateY(-4px); }

.modal { opacity: 0; transition: opacity 150ms; }
.modal[data-open="true"] { opacity: 1; }
```

```tsx
<div className="modal" data-open={isOpen}>...</div>
```

Set a CSS variable / data attribute / class from React; let CSS handle the timing. This is the lightest possible approach, works with the React Compiler, plays nicely with Tailwind.

What CSS can't do well:
- Animating an element as it **leaves** the DOM (CSS doesn't know about React unmounts).
- **Layout animations** when items reorder (positions change instantly; CSS sees them already there).
- **Spring physics** (CSS only does fixed-duration tweens).
- **Gestures** (drag, pinch, swipe).

That's where Motion comes in.

## Motion (formerly Framer Motion)

```bash
npm install motion
```

```tsx
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Hello
</motion.div>
```

`motion.div` is a regular div with animation superpowers. `initial` is the start state; `animate` is the target. Motion interpolates between them.

`transition` controls timing — duration, easing, or for springs:
```tsx
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

Springs feel better than tweens for "snap to place" animations. Tweens feel better for fades and orchestrated reveals.

## Enter/exit animations with `AnimatePresence`

CSS can't animate a DOM node out, because by the time React unmounts it, it's gone. Motion's `<AnimatePresence>` keeps unmounting children alive long enough to play an exit animation.

```tsx
import { AnimatePresence, motion } from "motion/react";

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      Modal content
    </motion.div>
  )}
</AnimatePresence>
```

When `isOpen` flips to false, Motion plays the `exit` animation, *then* removes the element. Standard for modals, toasts, dropdowns.

Each animatable child needs a stable `key`. Without it, Motion can't tell which one to animate.

## Layout animations (the magic feature)

When a list reorders, you want items to glide between positions. Add `layout` to a `motion` element and Motion measures before/after positions and animates the difference automatically:

```tsx
{tasks.map(t => (
  <motion.li key={t.id} layout>{t.title}</motion.li>
))}
```

Reorder the array; items physically slide. Combine with dnd-kit (doc 21) for the smoothest sortable lists you'll ever write.

Use sparingly — `layout` re-measures on every render, which can be expensive on long lists. Don't sprinkle on everything.

## Gestures (drag, hover, tap)

```tsx
<motion.div
  drag
  dragConstraints={{ top: 0, bottom: 100, left: 0, right: 100 }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Drag me
</motion.div>
```

`drag` makes anything draggable (separate from dnd-kit's structured DnD; this is for free-form drag like dismissable cards). `whileHover` / `whileTap` apply a state while that interaction is active.

For real DnD lists, still use dnd-kit. For simple "swipe to dismiss" or "drag a notification away," Motion's `drag` is enough.

## Stagger and orchestration

Animate child elements in a wave:

```tsx
const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const item = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

<motion.ul variants={container} initial="initial" animate="animate">
  {items.map(i => <motion.li key={i.id} variants={item}>{i.name}</motion.li>)}
</motion.ul>
```

Variants are named animation states. Parent's `staggerChildren` offsets each child's animation start. Cleaner than wiring delays manually.

## Performance considerations

- **Animate `transform` and `opacity`, not layout properties.** `transform: translateX(...)` runs on the GPU and doesn't trigger layout recalc. Animating `width`, `top`, `left` does — slow on long pages.
- **Don't `layout` everything.** Selective use. Profile with the browser's Performance tab.
- **Reduce motion for users who request it.** Respect `prefers-reduced-motion`:
  ```tsx
  import { useReducedMotion } from "motion/react";
  const reduce = useReducedMotion();
  <motion.div animate={reduce ? {} : { y: 0, opacity: 1 }} ... />
  ```
  Many users have this set due to vestibular sensitivities. Don't ignore it.

## When to animate

Animation is purposeful, not decorative. Three legitimate reasons:

1. **Causality** — something changed *because* of an action. The change should be smooth so the user understands.
2. **Continuity** — items moving between positions should slide, not teleport.
3. **Affordance** — a hover lift tells the user "this is interactive."

If you can't articulate a reason, leave it static. Excessive animation feels gimmicky and fights screen readers.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/21-animations/, install motion. Build five small examples:

1. anim-css.tsx: a simple expanding card using only CSS transitions. Show
   me the React side (toggle a class/data-attr) is trivial — CSS does all
   the work.

2. anim-modal.tsx: a Modal using AnimatePresence + motion.div with enter/
   exit fade+scale. The trigger button sets isOpen state.

3. anim-list.tsx: a list of items where adding/removing animates in/out
   with AnimatePresence. Bonus: items have `layout` so they slide when
   one is removed from the middle.

4. anim-stagger.tsx: a staggered reveal of grid items on first render
   using variants and staggerChildren.

5. anim-drag.tsx: a card with `drag` and `dragConstraints`, `whileHover`,
   `whileTap`. No real drop logic — just feel the gestures.

Use TypeScript strictly. Respect prefers-reduced-motion in at least one
example so I see the pattern.
```

**2. CSS-vs-Motion decision exercise:**
```
For each of these effects, decide: plain CSS, Motion, or "don't animate":
- Hover lift on a card
- Fade+slide a modal in
- A success checkmark drawing itself
- Reordering items in a kanban smoothly
- A toast that flies in from the right and exits to the right
- A subtle background gradient shift
- A page transition between routes
- A "shake" on form validation error
Justify each choice in one line.
```

**3. Pairing with dnd-kit:**
```
Combine Motion's layout animations with the dnd-kit kanban from doc 21.
Each card should slide smoothly between positions on drop. Show me the
diff and explain how layout + dnd-kit's transform interact (and how to
avoid double-animation).
```

## Checkpoints

1. When is plain CSS sufficient and when do you need Motion?
2. Why can't CSS alone animate an element as it leaves the React tree?
3. What does Motion's `layout` prop do?
4. Why prefer animating `transform`/`opacity` over `width`/`top`?
5. What's `prefers-reduced-motion` and why must you honor it?
6. What's the role of `key` on AnimatePresence children?

## Footguns

- **Animating layout properties on long lists.** Causes layout thrash and dropped frames. Use `transform`.
- **Forgetting `key` inside `AnimatePresence`.** Exit animations don't fire correctly.
- **Conditional `motion` element where the conditional removes the element entirely without AnimatePresence.** You get the enter animation but no exit.
- **Layout-animating every list item.** Costly. Apply `layout` only where it actually adds value.
- **Long durations on common interactions.** 800ms on a hover feels sluggish. UI-feedback animations should be 150–300ms; "explanatory" or "delightful" ones can go longer.
- **Ignoring `prefers-reduced-motion`.** Real users get nauseated by parallax/big animations. Branch on the hook.
- **Motion + CSS transitions on the same property.** They fight. Pick one source of truth per property.
- **Bouncy spring on every action.** Springy is fun once, distracting always.

## Ask-the-agent cheatsheet

- *"For this UI feature [describe], decide between CSS transitions and Motion. Pick the lighter option that achieves the goal. Implement it."*
- *"Add enter/exit animations to this modal/dropdown using AnimatePresence with a fade+scale. Respect prefers-reduced-motion."*
- *"This list reorders abruptly. Add Motion's `layout` so items glide between positions. Identify any performance concerns."*
- *"Audit the animations in this component. For each one, tell me: is it serving a purpose (causality / continuity / affordance) or is it decoration?"*
- *"Pair Motion's layout animation with the dnd-kit setup. Avoid double-animation conflicts; tell me which library should own the drag transform."*

## Where this goes next

- **Doc 23** — Internationalization, where text-direction (RTL) intersects with animations (slide directions need to flip).
