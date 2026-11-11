import { Formula } from "./componenti/Formula";
import { TabBar } from "./componenti/TabBar";
import { sections } from "./sections";
import { currentSection } from "./state";

/** Formula di prova: serve a controllare che KaTeX e i suoi caratteri funzionino in entrambe le versioni. */
const TEST_FORMULA = String.raw`x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}`;

/** Segnaposto di una sezione: le schermate vere arrivano nelle fasi successive. */
function SectionPlaceholder({ title, children }: { title: string; children?: preact.ComponentChildren }) {
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">{title}</h1>
      <p class="muted">In costruzione.</p>
      {children}
    </section>
  );
}

export function App() {
  const id = currentSection.value;
  const section = sections.find((s) => s.id === id) ?? sections[0];
  return (
    <>
      <main class="page">
        <SectionPlaceholder title={section.label}>
          {id === "oggi" && (
            <div class="card">
              <p class="muted">Formula di prova:</p>
              <Formula tex={TEST_FORMULA} display />
            </div>
          )}
        </SectionPlaceholder>
      </main>
      <TabBar />
    </>
  );
}
