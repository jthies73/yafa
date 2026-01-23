# YAFA - Yet Another Fitness App

A gym companion tool designed to provide a flexible framework for tracking progress and managing training variables. The primary goal is to facilitate **progressive overload** through user-created plans that incorporate periodization and autoregulation.

## Tech Stack

React 19 + TypeScript · Bun · Vite · Tailwind CSS · Zustand · Radix UI

---

## Features

### 🧮 Weight Calculator

The core feature of YAFA is an intelligent weight calculator that determines the optimal load for any exercise based on your training parameters.

**How it works:**

1. **Select an Exercise** – Choose from your custom exercise library
2. **View Your E1RM** – Your estimated one-rep max is displayed based on previous performance
3. **Enter Target Reps** – Specify how many repetitions you plan to perform
4. **Set Target RPE** – Choose your intended Rate of Perceived Exertion (6-10 scale)
5. **Get Your Weight** – The calculator outputs the recommended weight, adjusted to your equipment's minimum increment

**After completing a set:**

- Log your **actual RPE** to capture real-world performance
- The app calculates a new E1RM from the set you just performed
- If your performance exceeded expectations (new E1RM > old E1RM), you're prompted to update your baseline

**Supported 1RM formulas:**
- Brzycki (default)
- Epley, Lander, Lombardi, Mayhew, O'Conner, Wathan
- Average of all formulas

**RPE-based adjustments:**
- The calculator automatically suggests appropriate target RPE based on rep ranges
- Lower rep ranges (1–4) → RPE 7
- Medium rep ranges (5–6) → RPE 8–9
- Higher rep ranges (7+) → RPE 10

**Bodyweight exercise support:**
- Exercises can specify a bodyweight percentage (e.g., pull-ups use ~100% bodyweight, dips ~80%)
- The calculator factors in your current bodyweight from measurements to compute accurate load recommendations

---

### 🏋️ Exercise Management

Create and manage a personalized exercise library with exercise-specific configuration:

- **Name** – Exercise identifier
- **E1RM** – Estimated one-rep max, automatically updated as you train
- **Minimum Weight Increment** – Matches your available equipment (e.g., 2.5 kg for barbell, 2 kg for dumbbells)
- **Bodyweight Percentage** – For movements where bodyweight contributes to the load

Exercises can be created, edited, and deleted. Deleting an exercise also removes associated history entries.

---

### 📊 Workout History

A chronological log of all completed sets, grouped by day:

| Data Point | Description |
|------------|-------------|
| **Exercise** | Which movement was performed |
| **Sets** | Number of sets completed that day |
| **Best Set** | The set with the highest calculated E1RM (reps × weight @ RPE) |
| **E1RM** | Estimated one-rep max from the best set |

You can manually add sets to the history for past workouts.

---

### 📏 Measurements Tracking

Track any measurable metric over time:

- **Bodyweight** – Pre-configured, used by the calculator for bodyweight-adjusted exercises
- **Custom Measurements** – Add any metric with a custom name and unit (e.g., arm circumference in cm, body fat %)

Each measurement maintains a timestamped history of entries that can be viewed and edited.

---

## Data Persistence

All data is stored locally in the browser using Zustand's persist middleware with localStorage:

| Store | Purpose |
|-------|---------|
| `calculator-storage` | Current calculator state (selected exercise, reps, RPE, weight) |
| `exercise-storage` | Exercise library with E1RM values |
| `history-storage` | Complete workout history |
| `measurement-storage` | Body measurements and custom metrics |

---

## Development

> **Note:** This project uses [Bun](https://bun.sh) as the runtime. See [BUN_MIGRATION.md](./BUN_MIGRATION.md) for details.

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Start development server
bun dev

# Run tests
bun test

# Lint and format
bun lint
bun format

# Type check
bun type-check

# Run full CI checks
bun ci
```
