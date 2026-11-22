// Pagina di prova per test/app/riordino-chrome.test.ts: la schermata di esercizio vera (ExerciseView)
// con un esercizio di riordino del generatore di prova, come la vedrebbe Andrea sul telefono, con lo
// stile vero. «Esercizio simile» passa al seme successivo. Il tema si sceglie con #dark nell'indirizzo;
// il registro dei tentativi si legge da `compassoAttempts()`. Non entra nell'app.

import { render } from "preact";
import { useState } from "preact/hooks";
import { ExerciseView } from "../../../src/app/componenti/ExerciseView";
import { attempts } from "../../../src/app/state";
import { generateExercise } from "../../../src/esercizi";
import generator from "../../esercizi/fixtures/ordering-generator";

document.documentElement.setAttribute("data-theme", location.hash === "#dark" ? "dark" : "light");
Object.assign(window, { compassoAttempts: () => attempts.value });

function Page() {
  const [seed, setSeed] = useState(4);
  const exercise = generateExercise(generator, 2, seed);
  return (
    <main class="page">
      <ExerciseView key={seed} exercise={exercise} context="esercizi" onSimilar={() => setSeed(seed + 1)} />
    </main>
  );
}

render(<Page />, document.getElementById("app") as HTMLElement);
