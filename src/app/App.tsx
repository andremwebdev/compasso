import { TabBar } from "./componenti/TabBar";
import { LessonView } from "./schermate/LessonView";
import { Practice } from "./schermate/Practice";
import { Esercizi, Oggi, Test, Tu } from "./schermate/Sections";
import { GlossaryView, ModuleView, TeoriaHome, VolumeView } from "./schermate/Teoria";
import { currentSection, dataProblem, screen } from "./state";

/** La pagina iniziale della sezione aperta. */
function SectionHome() {
  switch (currentSection.value) {
    case "oggi":
      return <Oggi />;
    case "teoria":
      return <TeoriaHome />;
    case "esercizi":
      return <Esercizi />;
    case "test":
      return <Test />;
    case "tu":
      return <Tu />;
  }
}

/** La schermata aperta dentro la sezione. */
function CurrentScreen() {
  const current = screen.value;
  switch (current.kind) {
    case "home":
      return <SectionHome />;
    case "volume":
      return <VolumeView code={current.code} />;
    case "module":
      return <ModuleView code={current.code} />;
    case "lesson":
      return <LessonView key={current.code} code={current.code} />;
    case "glossary":
      return <GlossaryView />;
    case "practice":
      return <Practice key={current.key} plan={current.plan} />;
    case "flashcards":
    case "proof":
    case "mastery":
    case "diary":
      return <SectionHome />;
  }
}

export function App() {
  return (
    <>
      <main class="page">
        {dataProblem.value && (
          <p class="answer-problem" role="alert">
            {dataProblem.value}
          </p>
        )}
        <CurrentScreen />
      </main>
      <TabBar />
    </>
  );
}
